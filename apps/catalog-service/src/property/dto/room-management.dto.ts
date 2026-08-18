export interface PropertyRoomManagementDto {
    id: string;
    roomNumber: string;

    roomType: {
        id: string;
        typeName: string;
    };

    rentStatus: 'EMPTY' | 'RENTED' | 'DEBT' | 'ISSUE';

    tenant?: {
        id: string;
        name: string;
        phone?: string;
    };

    debtAmount: number;

    contract?: {
        id: string;
        contractNumber: string;
        endDate: string | null;
    };
}
