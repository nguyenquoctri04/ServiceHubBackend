export const ViolationType = {
    LATE_PAYMENT: 'LATE_PAYMENT',
    PROPERTY_DAMAGE: 'PROPERTY_DAMAGE',
    NOISE_DISTURBANCE: 'NOISE_DISTURBANCE',
    PET_POLICY_VIOLATION: 'PET_POLICY_VIOLATION',
    ILLEGAL_SUBLETTING: 'ILLEGAL_SUBLETTING',
    OTHER: 'OTHER'
} as const;

export type ViolationType = typeof ViolationType[keyof typeof ViolationType];
