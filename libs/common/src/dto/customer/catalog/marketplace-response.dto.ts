import { Provider } from "apps/catalog-service/src/categories/types/customer.categories.type";

export interface MarketplaceCategoryDto {
    id: string;
    name: string;
}

export interface MarketplaceServiceDto {
    id: string;
    title: string;
    description: string;
    category: string;
    image: string | null;
    price: number;
    address: string;
    distance: number | null;
    provider: Provider;
}

export interface MarketplaceServicesResponseDto {
    services: MarketplaceServiceDto[];

    pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    };
}
