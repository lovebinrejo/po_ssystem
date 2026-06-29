// UI-only placeholder until a legacy-backed endpoint exists. takeposnew/api/tables.php
// (action=getTables) is session-cookie auth only (same constraint as roomApi.js's
// getRooms) and can't be called from this app's X-API-Key-based session yet.
//
// Unlike Rooms (Building > Section > Room), legacy's Tables view has no section
// grouping — each floor is just a flat collection of physical tables rendered
// directly on the floor-plan grid (mirrors takeposnew's openTablesView()).
import { TABLE_STATUS } from "../statusMeta";

const STATUS_CYCLE = [
    TABLE_STATUS.AVAILABLE,
    TABLE_STATUS.OCCUPIED,
    TABLE_STATUS.RESERVED,
    TABLE_STATUS.BILLING,
    TABLE_STATUS.DISABLED,
    TABLE_STATUS.MAINTENANCE,
    TABLE_STATUS.AVAILABLE,
];

const makeTables = (prefix, count) =>
    Array.from({ length: count }, (_, i) => ({
        id: `${prefix}${i + 1}`,
        label: `Table ${i + 1}`,
        status: STATUS_CYCLE[i % STATUS_CYCLE.length],
    }));

const MOCK_TABLES_BY_FLOOR = {
    1: makeTables("ft1-", 14),
    2: makeTables("ft2-", 7),
    3: makeTables("ft3-", 7),
};

export const FLOOR_COUNT = 3;
export const TABLES_PER_ROW = 7;

export const fetchFloorTables = async (floor) => MOCK_TABLES_BY_FLOOR[floor] || [];

// Persists edited table statuses back into the in-memory mock store, so changes
// survive closing/reopening the modal for the rest of the session (no backend
// to save to yet — see the module header note above).
export const saveTableStatuses = async (floor, statusByTableId) => {
    const tables = MOCK_TABLES_BY_FLOOR[floor];
    if (!tables) return;
    MOCK_TABLES_BY_FLOOR[floor] = tables.map((table) =>
        table.id in statusByTableId ? { ...table, status: statusByTableId[table.id] } : table
    );
};
