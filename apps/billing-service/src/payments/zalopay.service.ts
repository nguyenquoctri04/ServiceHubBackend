import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as https from 'https';
import * as querystring from 'querystring';

export interface ZalopayCreateOrderResult {
  paymentUrl: string;
  appTransId: string;
  zpTransToken: string;
}

export interface ZalopayCallbackBody {
  data: string;
  mac: string;
  type: number;
}

export interface ZalopayCallbackResult {
  isValid: boolean;
  isSuccess: boolean;
  appTransId: string;
  zpTransId?: string;
  amount?: number;
}

export interface ZalopayQueryResult {
  isSuccess: boolean;
  returnCode: number;
  returnMessage: string;
  appTransId: string;
  zpTransId?: string;
  amount?: number;
}

@Injectable()
export class ZalopayService {
  private readonly logger = new Logger(ZalopayService.name);

  private readonly appId: string;
  private readonly key1: string;
  private readonly key2: string;
  private readonly createOrderUrl: string;
  private readonly queryUrl: string;
  private readonly callbackUrl: string;
  private readonly redirectUrl: string;

  constructor(private readonly config: ConfigService) {
    this.appId          = this.config.get<string>('ZALOPAY_APP_ID', '');
    this.key1           = this.config.get<string>('ZALOPAY_KEY1', '');
    this.key2           = this.config.get<string>('ZALOPAY_KEY2', '');
    this.createOrderUrl = this.config.get<string>(
      'ZALOPAY_CREATE_ORDER_URL',
      'https://sb-openapi.zalopay.vn/v2/create',
    );
    this.queryUrl = this.config.get<string>(
      'ZALOPAY_QUERY_URL',
      'https://sb-openapi.zalopay.vn/v2/query',
    );
    this.callbackUrl  = this.config.get<string>('ZALOPAY_CALLBACK_URL', '');
    this.redirectUrl  = this.config.get<string>('ZALOPAY_REDIRECT_URL', '');
  }

  /**
   * Tạo đơn hàng ZaloPay và lấy URL thanh toán.
   * @param appTransId  Mã giao dịch của app (thường là paymentId hoặc invoiceId)
   * @param amount      Số tiền (VNĐ)
   * @param description Mô tả đơn hàng
   * @param embedData   Dữ liệu nhúng thêm (tùy chọn)
   */
  async createOrder(
    appTransId: string,
    amount: number,
    description: string,
    embedData: Record<string, unknown> = {},
  ): Promise<ZalopayCreateOrderResult> {
    const appTime = Date.now();

    // ZaloPay yêu cầu format: yyMMdd_appTransId
    const formattedTransId = this.buildAppTransId(appTransId);

    const order: Record<string, string | number> = {
      app_id:       Number(this.appId),
      app_user:     'servicehub_user',
      app_time:     appTime,
      amount:       Math.round(amount),
      app_trans_id: formattedTransId,
      embed_data:   JSON.stringify({ ...embedData, redirecturl: this.redirectUrl }),
      item:         JSON.stringify([]),
      description,
      bank_code:    '',
      callback_url: this.callbackUrl,
    };

    // mac = HMAC_SHA256(key1, app_id|app_trans_id|app_user|amount|app_time|embed_data|item)
    const macData =
      order.app_id       + '|' +
      order.app_trans_id + '|' +
      order.app_user     + '|' +
      order.amount       + '|' +
      order.app_time     + '|' +
      order.embed_data   + '|' +
      order.item;

    order.mac = crypto
      .createHmac('sha256', this.key1)
      .update(macData)
      .digest('hex');

    const response = await this.postForm(this.createOrderUrl, order);

    this.logger.log(
      `ZaloPay createOrder: appTransId=${formattedTransId} returnCode=${response?.return_code}`,
    );

    if (response?.return_code !== 1) {
      throw new Error(
        `ZaloPay createOrder failed: ${response?.return_message ?? 'unknown error'}`,
      );
    }

    return {
      paymentUrl:   response.order_url,
      appTransId:   formattedTransId,
      zpTransToken: response.zp_trans_token ?? '',
    };
  }

  /**
   * Xác thực callback IPN từ ZaloPay server.
   * ZaloPay POST JSON { data, mac, type } về callbackUrl.
   */
  verifyCallback(body: ZalopayCallbackBody): ZalopayCallbackResult {
    const computedMac = crypto
      .createHmac('sha256', this.key2)
      .update(body.data)
      .digest('hex');

    const isValid = computedMac === body.mac;

    if (!isValid) {
      this.logger.warn('ZaloPay callback: invalid MAC');
      return { isValid: false, isSuccess: false, appTransId: '' };
    }

    let dataObj: any = {};
    try {
      dataObj = JSON.parse(body.data);
    } catch {
      return { isValid: true, isSuccess: false, appTransId: '' };
    }

    this.logger.log(
      `ZaloPay callback verify: appTransId=${dataObj.app_trans_id} zpTransId=${dataObj.zp_trans_id}`,
    );

    return {
      isValid:    true,
      isSuccess:  true,
      appTransId: dataObj.app_trans_id ?? '',
      zpTransId:  dataObj.zp_trans_id ? String(dataObj.zp_trans_id) : undefined,
      amount:     dataObj.amount ? Number(dataObj.amount) : undefined,
    };
  }

  /**
   * Query trạng thái giao dịch từ ZaloPay.
   * @param appTransId  Mã giao dịch đã tạo (format: yyMMdd_xxx)
   */
  async queryTransaction(appTransId: string): Promise<ZalopayQueryResult> {
    const params: Record<string, string | number> = {
      app_id:       Number(this.appId),
      app_trans_id: appTransId,
    };

    const macData = `${params.app_id}|${params.app_trans_id}|${this.key1}`;
    params.mac = crypto
      .createHmac('sha256', this.key1)
      .update(macData)
      .digest('hex');

    const response = await this.postForm(this.queryUrl, params);

    this.logger.log(
      `ZaloPay queryTransaction: appTransId=${appTransId} returnCode=${response?.return_code}`,
    );

    return {
      isSuccess:     response?.return_code === 1,
      returnCode:    response?.return_code ?? -1,
      returnMessage: response?.return_message ?? '',
      appTransId,
      zpTransId:     response?.zp_trans_id ? String(response.zp_trans_id) : undefined,
      amount:        response?.amount ? Number(response.amount) : undefined,
    };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  /**
   * ZaloPay yêu cầu format app_trans_id: yyMMdd_<unique>
   * Lấy 6 ký tự đầu của appTransId để đảm bảo unique + readable
   */
  private buildAppTransId(rawId: string): string {
    const now = new Date();
    const yy  = String(now.getFullYear()).slice(-2);
    const mm  = String(now.getMonth() + 1).padStart(2, '0');
    const dd  = String(now.getDate()).padStart(2, '0');
    // rawId là UUID — lấy phần đầu không có dấu gạch, max 20 ký tự
    const shortId = rawId.replace(/-/g, '').substring(0, 20);
    return `${yy}${mm}${dd}_${shortId}`;
  }

  private postForm(
    url: string,
    params: Record<string, string | number>,
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const data = querystring.stringify(
        Object.fromEntries(
          Object.entries(params).map(([k, v]) => [k, String(v)]),
        ),
      );

      const urlObj = new URL(url);
      const options = {
        hostname: urlObj.hostname,
        path:     urlObj.pathname + urlObj.search,
        method:   'POST',
        headers:  {
          'Content-Type':   'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(data),
        },
      };

      const req = https.request(options, (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(raw));
          } catch {
            resolve({});
          }
        });
      });

      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }
}
