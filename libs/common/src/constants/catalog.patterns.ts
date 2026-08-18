export const CatalogPatterns = {
    PROPERTY_FIND_BY_ID: 'catalog.property.findById',
    PROPERTY_CREATE: 'catalog.property.create',
    PROPERTY_UPDATE: 'catalog.property.update',
    PROPERTY_DELETE: 'catalog.property.delete',
    PROPERTIES_FIND_BY_PROVIDER: 'catalog.properties.findByProvider',

    BLOCK_CREATE: 'catalog.block.create',
    BLOCK_UPDATE: 'catalog.block.update',
    BLOCK_DELETE: 'catalog.block.delete',
    BLOCKS_FIND_BY_PROPERTY: 'catalog.blocks.findByProperty',

    FLOOR_CREATE: 'catalog.floor.create',
    FLOOR_UPDATE: 'catalog.floor.update',
    FLOOR_DELETE: 'catalog.floor.delete',
    FLOORS_FIND_BY_BLOCK: 'catalog.floors.findByBlock',

    ROOMS_FIND_BY_FLOOR: 'catalog.rooms.findByFloor',
    ROOMS_FIND_BY_PROPERTY: 'catalog.rooms.findByProperty',
    ROOM_CREATE: 'catalog.room.create',
    ROOM_TYPE_CREATE: 'catalog.roomType.create',
    ROOM_TYPE_UPDATE: 'catalog.roomType.update',
    ROOM_TYPE_DELETE: 'catalog.roomType.delete',
    ROOM_TYPES_FIND_BY_PROPERTY: 'catalog.roomTypes.findByProperty',
    ROOMS_FIND_BY_IDS: 'catalog.rooms.findByIds',

    ROOMS_COUNT_BY_PROVIDER: 'catalog.rooms.countByProvider',
} as const;
