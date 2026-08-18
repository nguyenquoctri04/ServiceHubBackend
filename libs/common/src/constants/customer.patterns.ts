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

    public static readonly GET_SERVICES = this.SERVICES + "get-services";

    public static readonly GET_CATEGORIES = this.CATEGORIES + "get-categories";

    public static readonly GET_SERVICE_DETAIL =
        this.SERVICES + "get-service-detail";

    public static readonly GET_RELATED_SERVICES =
        this.SERVICES + "get-related-services";

    public static readonly GET_PROVIDER_SERVICES_AND_PROPERTIES =
        this.SERVICES + "get-provider-services-and-properties";

    public static readonly VALIDATE_SERVICE_PRICE =
        this.SERVICES + "validate-service-price";

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

    public static readonly GET_MARKETPLACE_RESTRICTIONS =
        this.CONTRACTS + "get-marketplace-restrictions";

    public static readonly CHECK_SERVICE_ACCESS =
        this.CONTRACTS + "check-service-access";

    public static readonly CHECK_PROVIDER_ACCESS =
        this.CONTRACTS + "check-provider-access";

    public static readonly GET_PROVIDER_SERVICE_INSIGHTS =
        this.CONTRACTS + "get-provider-service-insights";

    public static readonly CREATE_SERVICE_BOOKING =
        this.CONTRACTS + "create_service_booking";

    public static readonly GET_CONTRACT_FILE_HASH_FOR_SIGNING =
        this.CONTRACTS + "get-contract-file-hash-for-signing";

    public static readonly GET_CONTRACT_FILE_HASH_FOR_VERIFY =
        this.CONTRACTS + "get_contract_file_hash_for_verify";

    /*
        ===============================
            Identity & eKYC Service
        ===============================
    */
    public static readonly EKYC = "customer.ekyc.";
    public static readonly IDENTITIES = "customer.identities.";

    public static readonly GET_PROVIDER_IN_POPULAR =
        this.IDENTITIES + "get-provider-in-popular";

    public static readonly GET_PROVIDER_SUMMARY =
        this.IDENTITIES + "get-provider-summary";

    public static readonly GET_ACCESSIBLE_PROVIDERS =
        this.IDENTITIES + "get-accessible-providers";

    public static readonly GET_PROVIDER_DETAIL_FOR_CUSTOMER =
        this.IDENTITIES + "get-provider-detail-for-customer";

    public static readonly GET_CUSTOMER_INFORMATION =
        this.IDENTITIES + "get-customer-information";

    public static readonly GET_SIGNATURE_INFOR =
        this.IDENTITIES + "get-signature-infor";

    /*
        ===============================
            Notification Service
        ===============================
    */
    public static readonly NOTIFICATION = "customer.notification.";

    public static readonly NOTIFY_SERVICE_REGISTRATION =
        this.NOTIFICATION + "notify-service-registration";

    /*
        ===============================
            Signature Service
        ===============================
    */
    public static readonly KEYS = "customer.keys.";
    public static readonly SIGNATURES = "customer.signatures.";

    public static readonly GET_DIGITAL_SIGNATURE_IN_SETTING =
        this.KEYS + "get-digital-signature-in-setting";

    public static readonly CREATE_SIGNATURE = this.KEYS + "create";

    public static readonly SIGN_CONTRACT_FILE =
        this.SIGNATURES + "sign-contract-file";

    public static readonly VERIFY_CONTRACT =
        this.SIGNATURES + "verify-contract";
}
