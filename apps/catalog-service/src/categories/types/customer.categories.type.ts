export interface Category {
    id: string;
    name: string;
    totalService: number;
}

export interface ServicePriceMapping {
    servicePriceId: string;
    serviceId: string;
    providerId: string;
}

export interface PopularServicePrice {
    servicePriceId: string;
    count: number;
}

export interface PopularService {
    id: string;
    providerId: string;
    title: string;
    category: string;
    image: string;
    price: number;
    priceUnit: string;
    location: string;
}

export interface Provider {
    id: string;
    providerName: string;
}

export interface GetHomeCategoriesResponse {
    categories: Category[];
    popularServices: Array<
        PopularService & {
            provider: string;
        }
    >;
}