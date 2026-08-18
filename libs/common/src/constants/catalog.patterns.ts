export const CatalogPatterns = {
    PROPERTY_FIND_BY_ID: 'catalog.property.findById',
    PROPERTY_CREATE: 'catalog.property.create',
    PROPERTY_UPDATE: 'catalog.property.update',
    PROPERTY_DELETE: 'catalog.property.delete',
    PROPERTIES_FIND_BY_PROVIDER: 'catalog.properties.findByProvider',

    BLOCK_CREATE: 'catalog.block.create',
    BLOCKS_FIND_BY_PROPERTY: 'catalog.blocks.findByProperty',

    FLOOR_CREATE: 'catalog.floor.create',
    FLOORS_FIND_BY_BLOCK: 'catalog.floors.findByBlock',

    ROOMS_FIND_BY_FLOOR: 'catalog.rooms.findByFloor',
    ROOMS_FIND_BY_PROPERTY: 'catalog.rooms.findByProperty',
    ROOM_TYPE_CREATE: 'catalog.roomType.create',
    ROOM_TYPES_FIND_BY_PROPERTY: 'catalog.roomTypes.findByProperty',
    ROOMS_FIND_BY_IDS: 'catalog.rooms.findByIds',

    ROOMS_COUNT_BY_PROVIDER: 'catalog.rooms.countByProvider',
} as const;
