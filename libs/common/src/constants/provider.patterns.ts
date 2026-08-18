export class ProviderContractPatterns {
  public static readonly CREATE = 'contracts.create';
  public static readonly UPDATE = 'contracts.update';
  public static readonly SEND = 'contracts.send';
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
  public static readonly RESTRICTIONS_FIND = 'contracts.restrictions.find';
  public static readonly RESTRICTIONS_LIFT = 'contracts.restrictions.lift';
  public static readonly PROPERTIES_FIND = 'catalog.properties.find';
}
