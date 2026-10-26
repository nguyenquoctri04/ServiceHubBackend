export interface ProviderRpcSummary {
  id: string;
  identityId: string;
  providerName: string;
  providerType: 'PROPERTY_MANAGER' | 'EXTERNAL_SERVICE';
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'DISABLE';
  address?: string;
  phone?: string;
  email?: string;
  companyName?: string;
  taxCode?: string;
  businessLicenseNumber?: string;
  representativeName?: string;
  representativePosition?: string;
  businessType?: string;
  accountNumber?: string;
  bankName?: string;
}
