/**
 * Message patterns cho Customer Billing Service.
 * Dùng trong API Gateway → billing-service communication.
 */
export class CustomerBillingPatterns {
  // ── Invoices ────────────────────────────────────────────────────────────
  /** GET danh sách hóa đơn của customer (phân trang, filter) */
  public static readonly INVOICES_FIND         = 'customer.billing.invoices.find';
  /** GET chi tiết một hóa đơn */
  public static readonly INVOICES_FIND_ONE     = 'customer.billing.invoices.findOne';
  /** POST thanh toán hóa đơn (CASH / VNPAY / ZALOPAY) */
  public static readonly INVOICES_PAY          = 'customer.billing.invoices.pay';

  // ── Payments ────────────────────────────────────────────────────────────
  /** POST tạo payment link cho VNPAY hoặc ZALOPAY */
  public static readonly PAYMENTS_CREATE_LINK      = 'customer.billing.payments.createLink';
  /** GET/POST callback từ VNPay → billing-service verify + update DB */
  public static readonly PAYMENTS_VNPAY_CALLBACK   = 'customer.billing.payments.vnpay.callback';
  /** POST callback IPN từ ZaloPay → billing-service verify + update DB */
  public static readonly PAYMENTS_ZALOPAY_CALLBACK = 'customer.billing.payments.zalopay.callback';
  /** GET kiểm tra trạng thái payment (FE polling) */
  public static readonly PAYMENTS_CHECK_STATUS     = 'customer.billing.payments.checkStatus';
}
