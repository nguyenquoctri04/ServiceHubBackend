export class AuditPatterns {
  /** EventPattern — fire-and-forget, no HMAC envelope */
  public static readonly LOG      = 'audit.log';

  /** MessagePattern — RPC query, HMAC-protected via secureRpc.send() */
  public static readonly GET_LOGS = 'audit.getLogs';
}
