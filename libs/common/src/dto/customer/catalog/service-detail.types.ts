export interface ServiceDetailPrice {
    id: string;
    price: number;
    unit: string;
}

export interface ServiceDetailRequiredService {
    id: string;
    name: string;
    description: string | null;
    price: number | null;
    unit: string | null;
}

export interface ServiceDetailProvider {
    id: string;
    providerName: string;
    logoUrl: string | null;
    description: string | null;
    businessType: "INDIVIDUAL" | "HOUSEHOLD" | "COMPANY";
    companyName: string | null;
    address: string | null;
    website: string | null;
}

export interface ServiceDetailCategory {
    id: string;
    name: string;
}

export interface ServiceDetailData {
    id: string;
    name: string;
    description: string | null;
    address: string | null;
    image: string | null;
    images: string[];
    distanceKm: number | null;
    category: ServiceDetailCategory;
    provider: ServiceDetailProvider;
    prices: ServiceDetailPrice[];
    requiredServices: ServiceDetailRequiredService[];
}
