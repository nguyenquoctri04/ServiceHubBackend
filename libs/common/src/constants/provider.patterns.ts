export class ProviderContractPatterns {
  public static readonly CREATE = 'contracts.create';
  public static readonly UPDATE = 'contracts.update';
  public static readonly SEND = 'contracts.send';
  public static readonly SIGNING_FILE_FIND = 'contracts.signingFile.find';
  public static readonly REVOKE = 'contracts.revoke';
  public static readonly CANCEL = 'contracts.cancel';
  public static readonly FIND = 'contracts.find';
  public static readonly FIND_ONE = 'contracts.findOne';
  public static readonly FIND_BY_IDS = 'contracts.findByIds';
  public static readonly FIND_ACTIVE_BY_ROOM_IDS = 'contracts.findActiveByRoomIds';
  public static readonly HAS_ROOM_REFERENCES = 'contracts.hasRoomReferences';
  public static readonly FIND_DRAFT_BY_REQUEST_NUMBER = 'contracts.findDraftByRequestNumber';
  public static readonly TEMPLATES_FIND = 'contracts.templates.find';
  public static readonly TEMPLATES_FIND_ONE = 'contracts.templates.findOne';
  public static readonly TERMS_FIND = 'contracts.terms.find';
  public static readonly VIOLATIONS_FIND = 'contracts.violations.find';
  public static readonly CUSTOMERS_FIND = 'contracts.customers.find';
  public static readonly CUSTOMERS_BLOCK = 'provider.customers.block';
  public static readonly RESTRICTIONS_FIND = 'contracts.restrictions.find';
  public static readonly RESTRICTIONS_LIFT = 'contracts.restrictions.lift';
  public static readonly PROPERTIES_FIND = 'catalog.properties.find';

  // Provider Violations & Actions
  public static readonly VIOLATIONS_COUNT = 'provider.violations.count';
  public static readonly VIOLATIONS_CREATE = 'provider.violations.create';
  public static readonly VIOLATIONS_APPEALS_CREATE = 'provider.violations.appeals.create';
  public static readonly VIOLATIONS_HANDLE_ACTION = 'provider.violations.handleAction';
  public static readonly VIOLATIONS_RULES = 'provider.violations.rules';

  // Provider Dashboard & Analytics
  public static readonly DASHBOARD_STATS = 'contract.dashboardStats';
  public static readonly STATUS_DISTRIBUTION = 'contract.statusDistribution';
  public static readonly RECENT = 'contract.recent';
  public static readonly EXPIRING = 'contract.expiring';
}

export class ProviderIdentityPatterns {
  public static readonly GET_BY_ID_FOR_IDENTITY = 'providers.getByIdForIdentity';
  public static readonly GET_PROFILE = 'providers.getProfile';
  public static readonly UPDATE_PROFILE = 'providers.updateProfile';
  public static readonly ADD_LEGAL_DOCUMENT = 'providers.addLegalDocument';
  public static readonly GET_MY_PROVIDERS = 'providers.getMyProviders';
  public static readonly CREATE = 'providers.create';
  public static readonly IDENTITIES_BATCH = 'provider.identities.batch';
  public static readonly GET_BY_ID = 'get.provider.by.id';
  public static readonly GET_CUSTOMER_BY_ID = 'get.customer.by.id';
}
