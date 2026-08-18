export class CustomerPatterns {
    /*
        ===============================
            Audit Log Service
        ===============================
    */
    public static readonly AUDIT = "customer.audit.";

    /*
        ===============================
            Billing Service
        ===============================
    */
    public static readonly INVOICES = "customer.invoices.";
    public static readonly PAYMENTS = "customer.payments.";

    /*
        ===============================
            Catalog Service
        ===============================
    */
    public static readonly CATEGORIES = "customer.categories.";
    public static readonly SERVICES = "customer.services.";
    public static readonly UNITS = "customer.units.";

    public static readonly GET_HOME_CATEGORIES =
        this.CATEGORIES + "get-home-categories";
    public static readonly GET_ACTIVE_SERVICES_FOR_POPULAR =
        this.SERVICES + "get-active-services-for-popular";
    public static readonly GET_POPULAR_SERVICE_DETAIL =
        this.SERVICES + "get-popular-services";
    public static readonly GET_SERVICE_PRICE_MAPPINGS =
        this.SERVICES + "get-service-price-mappings";

    /*
        ===============================
            Contract Service
        ===============================
    */
    public static readonly CONTRACTS = "customer.contracts.";
    public static readonly TEMPLATES = "customer.templates.";
    public static readonly TERMS = "customer.terms.";
    public static readonly VIOLATIONS = "customer.violations.";

    public static readonly GET_POPULAR_SERVICES =
        this.CONTRACTS + "get-popular-services";

    /*
        ===============================
            Identity & eKYC Service
        ===============================
    */
    public static readonly EKYC = "customer.ekyc.";
    public static readonly EKYC_OCR = this.EKYC + "ocr";
    public static readonly EKYC_VERIFY_FACE = this.EKYC + "verify-face";
    public static readonly IDENTITIES = "customer.identities.";

    public static readonly GET_PROVIDER_IN_POPULAR =
        this.IDENTITIES + "get-provider-in-popular";

    /*
        ===============================
            Notification Service
        ===============================
    */
    public static readonly NOTIFICATION = "customer.notification.";

    /*
        ===============================
            Signature Service
        ===============================
    */
    public static readonly KEYS = "customer.keys.";
    public static readonly SIGNATURES = "customer.signatures.";
}
