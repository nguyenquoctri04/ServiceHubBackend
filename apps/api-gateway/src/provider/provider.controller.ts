// This file has been deprecated and its controller logic extracted to domain-specific modules.
// Do not add logic here.

export interface CurrentUserPayload {
  id: string;
  email: string;
  role: string;
  providerId?: string;
}
