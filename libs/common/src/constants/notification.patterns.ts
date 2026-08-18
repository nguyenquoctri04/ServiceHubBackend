export enum NotificationKindValue {
  BROADCAST = "BROADCAST",
  EVENT = "EVENT",
}

export enum NotificationTargetTypeValue {
  ALL = "ALL",
  ROLE = "ROLE",
  USER = "USER",
}

export enum NotificationEventType {
  CONTRACT_WAITING_SIGN = "CONTRACT_WAITING_SIGN",
  INVOICE_CREATED = "INVOICE_CREATED",
  PAYMENT_SUCCESS = "PAYMENT_SUCCESS",
  REPAIR_REQUEST_CREATED = "REPAIR_REQUEST_CREATED",
  PROVIDER_APPROVED = "PROVIDER_APPROVED",
  PROVIDER_REJECTED = "PROVIDER_REJECTED",
  SYSTEM_EVENT = "SYSTEM_EVENT",
}

export class NotificationPatterns {
  public static readonly ADMIN_CREATE = "notifications.admin.create";
  public static readonly EVENT_CREATE = "notifications.event.create";
  public static readonly USER_LIST = "notifications.user.list";
  public static readonly USER_MARK_READ = "notifications.user.mark-read";
  public static readonly USER_MARK_ALL_READ =
    "notifications.user.mark-all-read";
  public static readonly USER_UNREAD_COUNT =
    "notifications.user.unread-count";
}

export class IdentityNotificationPatterns {
  public static readonly RESOLVE_RECIPIENTS =
    "identity.notifications.resolve-recipients";
}
