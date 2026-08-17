export class Patterns {
  public static readonly IDENTITY_SERVICE_AUTH = "identity.auth.";
  public static readonly CHECK_USER_ACTIVE =
    Patterns.IDENTITY_SERVICE_AUTH + "check-user-active";
  public static readonly AUTH_LOGIN = "auth.login";
  public static readonly AUTH_REGISTER = "auth.register";
  public static readonly AUTH_SWITCH_PROFILE = "auth.switchProfile";
}
