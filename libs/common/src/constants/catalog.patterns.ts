export const CatalogPatterns = {
    PROPERTIES_FIND_BY_PROVIDER: 'catalog.properties.findByProvider',
    PROPERTY_FIND_BY_ID: 'catalog.properties.findById',

    BLOCKS_FIND_BY_PROPERTY: 'catalog.blocks.findByProperty',
    FLOORS_FIND_BY_BLOCK: 'catalog.floors.findByBlock',

    ROOMS_FIND_BY_FLOOR: 'catalog.rooms.findByFloor',
    ROOMS_FIND_BY_PROPERTY: 'catalog.rooms.findByProperty',
    ROOMS_FIND_BY_IDS: 'catalog.rooms.findByIds',

    ROOMS_COUNT_BY_PROVIDER: 'catalog.rooms.countByProvider',
} as const;
