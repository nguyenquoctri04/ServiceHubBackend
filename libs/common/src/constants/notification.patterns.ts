export enum NotificationChannelValue {
  EMAIL = "EMAIL",
  SMS = "SMS",
  PUSH = "PUSH",
  IN_APP = "IN_APP",
}

export enum NotificationStatusValue {
  PENDING = "PENDING",
  SENT = "SENT",
  FAILED = "FAILED",
  READ = "READ",
}

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
  // Platform & Admin & User patterns
  public static readonly ADMIN_CREATE = "notifications.admin.create";
  public static readonly EVENT_CREATE = "notifications.event.create";
  public static readonly USER_LIST = "notifications.user.list";
  public static readonly USER_MARK_READ = "notifications.user.mark-read";
  public static readonly USER_MARK_ALL_READ =
    "notifications.user.mark-all-read";
  public static readonly USER_UNREAD_COUNT =
    "notifications.user.unread-count";

  // Provider / In-App patterns
  public static readonly GET_USER_NOTIFICATIONS =
    "notifications.getUserNotifications";
  public static readonly CREATE_IN_APP =
    "notifications.createInApp";
  public static readonly MARK_ALL_READ =
    "notifications.markAllRead";
  public static readonly MARK_READ =
    "notifications.markRead";
  public static readonly PAYMENT_COMPLETED =
    "notifications.payment.completed";
}

export class IdentityNotificationPatterns {
  public static readonly RESOLVE_RECIPIENTS =
    "identity.notifications.resolve-recipients";
}
