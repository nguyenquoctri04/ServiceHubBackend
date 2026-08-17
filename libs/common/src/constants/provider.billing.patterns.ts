export class ProviderBillingPatterns {
  // Invoices
  public static readonly INVOICES_FIND = 'billing.invoices.find';
  public static readonly INVOICES_PAY = 'billing.invoices.pay';

  // Meters
  public static readonly METERS_FIND = 'billing.meters.find';
  public static readonly METERS_READING_CREATE = 'billing.meters.reading.create';
  public static readonly METERS_OCR = 'billing.meters.ocr';
  public static readonly METERS_OCR_CONFIRM = 'billing.meters.ocr.confirm';
  public static readonly METERS_IMPORT_PREVIEW = 'billing.meters.import.preview';
  public static readonly METERS_IMPORT_CONFIRM = 'billing.meters.import.confirm';

  // Cross-Service Batch RPCs
  public static readonly CATALOG_ROOMS_BY_IDS = 'catalog.rooms.byIds';
  public static readonly CONTRACTS_BY_IDS = 'contracts.byIds';

  // Events
  public static readonly EVENT_METER_READING_CONFIRMED = 'event.billing.meterReadingConfirmed';
  public static readonly EVENT_SERVICE_CREATED = 'event.catalog.serviceCreated';
}
