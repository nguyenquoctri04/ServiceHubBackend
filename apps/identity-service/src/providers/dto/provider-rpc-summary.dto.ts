export interface ProviderRpcSummary {
  id: string;
  identityId: string;
  providerName: string;
  providerType: 'PROPERTY_MANAGER' | 'EXTERNAL_SERVICE';
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'DISABLE';
}
