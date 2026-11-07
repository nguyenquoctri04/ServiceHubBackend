export class ContractEventPatterns {
  public static readonly SENT_FOR_SIGNING = 'contract.sent_for_signing.v1';
  public static readonly ACTIVATED = 'contract.activated.v1';
  public static readonly CANCELLED = 'contract.cancelled.v1';
  public static readonly ACTIVATION_FAILED = 'contract.activation_failed.v1';
  public static readonly TERMINATED = 'contract.terminated.v1';
}

export class BillingEventPatterns {
  public static readonly INVOICE_PAID = 'billing.invoice_paid.v1';
  public static readonly INVOICE_ISSUED = 'billing.invoice_issued.v1';
  public static readonly INVOICE_CANCELLED = 'billing.invoice_cancelled.v1';
  public static readonly REFUND_REQUESTED = 'billing.refund_requested.v1';
  public static readonly FINE_INVOICE_CREATED = 'billing.fine_invoice_created.v1';
}

export class ViolationEventPatterns {
  public static readonly FINE_IMPOSED = 'violation.fine_imposed.v1';
}
