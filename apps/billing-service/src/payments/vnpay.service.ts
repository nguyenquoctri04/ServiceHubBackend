import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as https from 'https';
import * as querystring from 'querystring';

export interface VnpayCreatePaymentResult {
  paymentUrl: string;
  txnRef: string;
}

export interface VnpayCallbackParams {
  vnp_TmnCode: string;
  vnp_Amount: string;
  vnp_BankCode?: string;
  vnp_BankTranNo?: string;
  vnp_CardType?: string;
  vnp_PayDate?: string;
  vnp_CurrCode?: string;
  vnp_OrderInfo: string;
  vnp_OrderType?: string;
  vnp_ResponseCode: string;
  vnp_TransactionNo?: string;
  vnp_TransactionStatus?: string;
  vnp_TxnRef: string;
  vnp_SecureHash: string;
  [key: string]: string | undefined;
}

export interface VnpayCallbackResult {
  isValid: boolean;
  isSuccess: boolean;
  txnRef: string;
  transactionNo: string;
  responseCode: string;
}

export interface VnpayQueryResult {
  isSuccess: boolean;
  responseCode: string;
  transactionStatus: string;
  txnRef: string;
  transactionNo: string;
  amount: number;
}

@Injectable()
export class VnpayService {
  private readonly logger = new Logger(VnpayService.name);

  private readonly tmnCode: string;
  private readonly hashSecret: string;
  private readonly vnpUrl: string;
  private readonly queryUrl: string;
  private readonly returnUrl: string;

  constructor(private readonly config: ConfigService) {
    this.tmnCode    = this.config.get<string>('VNPAY_TMN_CODE', '');
    this.hashSecret = this.config.get<string>('VNPAY_HASH_SECRET', '');
    this.vnpUrl     = this.config.get<string>('VNPAY_URL', 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html');
    this.queryUrl   = this.config.get<string>('VNPAY_QUERY_URL', 'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction');
    this.returnUrl  = this.config.get<string>('VNPAY_RETURN_URL', '');
  }

  /**
   * Tạo URL thanh toán VNPay.
   * @param txnRef     Mã tham chiếu giao dịch (thường là paymentId)
   * @param amount     Số tiền (VNĐ)
   * @param orderInfo  Thông tin đơn hàng (ngắn gọn, không dấu)
   * @param ipAddr     IP của người dùng
   * @param locale     'vn' | 'en'
   */
  createPaymentUrl(
    txnRef: string,
    amount: number,
    orderInfo: string,
    ipAddr: string,
    locale: 'vn' | 'en' = 'vn',
  ): VnpayCreatePaymentResult {
    const createDate = this.formatDate(new Date());

    const params: Record<string, string> = {
      vnp_Version:    '2.1.0',
      vnp_Command:    'pay',
      vnp_TmnCode:    this.tmnCode,
      vnp_Amount:     String(Math.round(amount * 100)), // VNPay nhân 100
      vnp_CreateDate: createDate,
      vnp_CurrCode:   'VND',
      vnp_IpAddr:     ipAddr,
      vnp_Locale:     locale,
      vnp_OrderInfo:  orderInfo,
      vnp_OrderType:  'other',
      vnp_ReturnUrl:  this.returnUrl,
      vnp_TxnRef:     txnRef,
    };

    const sortedParams = this.sortObject(params);
    const signData = querystring.stringify(sortedParams);
    const hmac = crypto.createHmac('sha512', this.hashSecret);
    const secureHash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    const paymentUrl =
      this.vnpUrl + '?' + signData + '&vnp_SecureHash=' + secureHash;

    this.logger.log(`VNPay payment URL created for txnRef=${txnRef}`);
    return { paymentUrl, txnRef };
  }

  /**
   * Xác thực chữ ký và kiểm tra kết quả callback từ VNPay.
   * Gọi tại endpoint GET /payments/vnpay/callback
   */
  verifyCallback(params: VnpayCallbackParams): VnpayCallbackResult {
    const secureHash = params.vnp_SecureHash;

    // Loại bỏ các field hash để verify
    const verifyParams: Record<string, string> = {};
    for (const key of Object.keys(params)) {
      if (key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType') {
        verifyParams[key] = params[key] as string;
      }
    }

    const sortedParams = this.sortObject(verifyParams);
    const signData = querystring.stringify(sortedParams);
    const hmac = crypto.createHmac('sha512', this.hashSecret);
    const computedHash = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    const isValid = computedHash === secureHash;
    // responseCode '00' = thành công, transactionStatus '00' = thành công
    const isSuccess =
      isValid &&
      params.vnp_ResponseCode === '00' &&
      (params.vnp_TransactionStatus === '00' || !params.vnp_TransactionStatus);

    this.logger.log(
      `VNPay callback verify: txnRef=${params.vnp_TxnRef} valid=${isValid} success=${isSuccess}`,
    );

    return {
      isValid,
      isSuccess,
      txnRef:        params.vnp_TxnRef,
      transactionNo: params.vnp_TransactionNo ?? '',
      responseCode:  params.vnp_ResponseCode,
    };
  }

  /**
   * Query trạng thái giao dịch từ VNPay server-side (IPN query).
   * Dùng để double-check khi cần thiết.
   */
  async queryTransaction(
    txnRef: string,
    transDate: string,
    ipAddr: string,
  ): Promise<VnpayQueryResult> {
    const createDate = this.formatDate(new Date());
    const requestId = crypto.randomBytes(8).toString('hex');

    const body: Record<string, string> = {
      vnp_RequestId:      requestId,
      vnp_Version:        '2.1.0',
      vnp_Command:        'querydr',
      vnp_TmnCode:        this.tmnCode,
      vnp_TxnRef:         txnRef,
      vnp_OrderInfo:      `Query transaction ${txnRef}`,
      vnp_TransactionDate: transDate,
      vnp_CreateDate:     createDate,
      vnp_IpAddr:         ipAddr,
    };

    const data =
      body.vnp_RequestId    + '|' +
      body.vnp_Version      + '|' +
      body.vnp_Command      + '|' +
      body.vnp_TmnCode      + '|' +
      body.vnp_TxnRef       + '|' +
      body.vnp_TransactionDate + '|' +
      body.vnp_CreateDate   + '|' +
      body.vnp_IpAddr       + '|' +
      body.vnp_OrderInfo;

    const hmac = crypto.createHmac('sha512', this.hashSecret);
    body.vnp_SecureHash = hmac.update(Buffer.from(data, 'utf-8')).digest('hex');

    const responseBody = await this.postJson(this.queryUrl, body);

    this.logger.log(
      `VNPay queryTransaction: txnRef=${txnRef} responseCode=${responseBody?.vnp_ResponseCode}`,
    );

    return {
      isSuccess:         responseBody?.vnp_ResponseCode === '00',
      responseCode:      responseBody?.vnp_ResponseCode ?? '',
      transactionStatus: responseBody?.vnp_TransactionStatus ?? '',
      txnRef:            responseBody?.vnp_TxnRef ?? txnRef,
      transactionNo:     responseBody?.vnp_TransactionNo ?? '',
      amount:            responseBody?.vnp_Amount
        ? Number(responseBody.vnp_Amount) / 100
        : 0,
    };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private sortObject(obj: Record<string, string>): Record<string, string> {
    return Object.keys(obj)
      .sort()
      .reduce(
        (sorted, key) => {
          sorted[key] = obj[key];
          return sorted;
        },
        {} as Record<string, string>,
      );
  }

  private formatDate(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return (
      date.getFullYear().toString() +
      pad(date.getMonth() + 1) +
      pad(date.getDate()) +
      pad(date.getHours()) +
      pad(date.getMinutes()) +
      pad(date.getSeconds())
    );
  }

  private postJson(url: string, body: Record<string, string>): Promise<any> {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify(body);
      const urlObj = new URL(url);
      const options = {
        hostname: urlObj.hostname,
        path:     urlObj.pathname + urlObj.search,
        method:   'POST',
        headers:  {
          'Content-Type':   'application/json',
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
