/*
  ===============================
    Audit Log Service
  ===============================
*/
export const CUSTOMER_AUDIT_SERVICE_PREFIX = "api/customer/audit";

export const CUSTOMER_AUDIT_ENDPOINT = {};

/*
  ===============================
    Billing Service
  ===============================
*/
export const CUSTOMER_BILLING_SERVICE_PREFIX = "api/customer/billing";

export const CUSTOMER_INVOICES = CUSTOMER_BILLING_SERVICE_PREFIX + "/invoices";
export const CUSTOMER_PAYMENTS = CUSTOMER_BILLING_SERVICE_PREFIX + "/payments";

export const CUSTOMER_BILLING_ENDPOINT = {};

/*
  ===============================
    Catalog Service
  ===============================
*/
export const CUSTOMER_CATALOG_SERVICE_PREFIX = "api/customer/catalog";

export const CUSTOMER_CATEGORIES =
    CUSTOMER_CATALOG_SERVICE_PREFIX + "/categories";
export const CUSTOMER_SERVICES = CUSTOMER_CATALOG_SERVICE_PREFIX + "/services";
export const CUSTOMER_UNITS = CUSTOMER_CATALOG_SERVICE_PREFIX + "/units";

export const CUSTOMER_CATALOG_ENDPOINT = {
    FETCH_HOME: "home",
    FETCH_SERVICE_DETAIL: "detail",
};

/*
  ===============================
    Contract Service
  ===============================
*/
export const CUSTOMER_CONTRACT_SERVICE_PREFIX = "api/customer/contract";

export const CUSTOMER_CONTRACTS =
    CUSTOMER_CONTRACT_SERVICE_PREFIX + "/contracts";
export const CUSTOMER_TEMPLATES =
    CUSTOMER_CONTRACT_SERVICE_PREFIX + "/templates";
export const CUSTOMER_TERMS = CUSTOMER_CONTRACT_SERVICE_PREFIX + "/terms";
export const CUSTOMER_VIOLATIONS =
    CUSTOMER_CONTRACT_SERVICE_PREFIX + "/violations";

export const CUSTOMER_CONTRACT_ENDPOINT = {};

/*
  ===============================
    Identity & eKYC Service
  ===============================
*/
export const CUSTOMER_IDENTITY_SERVICE_PREFIX = "api/customer/identity";

export const CUSTOMER_EKYC = CUSTOMER_IDENTITY_SERVICE_PREFIX + "/ekyc";
export const CUSTOMER_IDENTITIES =
    CUSTOMER_IDENTITY_SERVICE_PREFIX + "/identities";

export const CUSTOMER_IDENTITY_ENDPOINT = {
    FETCH_PROVIDER_DETAIL: "providers/:id/detail",
};

/*
  ===============================
    Notification Service
  ===============================
*/
export const CUSTOMER_NOTIFICATION_SERVICE_PREFIX = "api/customer/notification";

export const CUSTOMER_NOTIFICATION_ENDPOINT = {};

/*
  ===============================
    Signature Service
  ===============================
*/
export const CUSTOMER_SIGNATURE_SERVICE_PREFIX = "api/customer/signature";

export const CUSTOMER_KEYS = CUSTOMER_SIGNATURE_SERVICE_PREFIX + "/keys";
export const CUSTOMER_SIGNATURES =
    CUSTOMER_SIGNATURE_SERVICE_PREFIX + "/signatures";

export const CUSTOMER_SIGNATURE_ENDPOINT = {};
