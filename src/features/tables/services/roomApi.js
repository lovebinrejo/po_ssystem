// UI-only placeholder until a legacy-backed endpoint exists. takeposnew/api/tables.php
// (action=getRooms) is session-cookie auth only (same constraint as tableApi.js's
// getTables) and can't be called from this app's X-API-Key-based session yet.
//
// Building > Section > Room hierarchy, distributed across floors. Each section
// (Main Hall, Family Room, VIP Room, Outdoor) contains individually selectable
// rooms (Room 1, Room 2, ...) rendered as a 7-per-row floor-plan grid (position
// is computed in RoomsModal from each room's index, not stored here).
//   Floor 1 (ground/main dining): Main Hall, Family Room
//   Floor 2 (private dining):     VIP Room
//   Floor 3 (rooftop/al fresco):  Outdoor
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

const makeRooms = (prefix, count) =>
    Array.from({ length: count }, (_, i) => ({
        id: `${prefix}${i + 1}`,
        label: `Room ${i + 1}`,
        status: STATUS_CYCLE[i % STATUS_CYCLE.length],
    }));

const MOCK_ROOMS_BY_FLOOR = {
    1: [
        { id: "main-hall", label: "Main Hall", tables: makeRooms("t", 7) },
        { id: "family-room", label: "Family Room", tables: makeRooms("f", 7) },
    ],
    2: [{ id: "vip-room", label: "VIP Room", tables: makeRooms("vip", 7) }],
    3: [{ id: "outdoor", label: "Outdoor", tables: makeRooms("o", 7) }],
};

export const FLOOR_COUNT = 3;
export const ROOMS_PER_ROW = 7;

export const fetchRooms = async (floor) => MOCK_ROOMS_BY_FLOOR[floor] || [];

// Persists edited room statuses back into the in-memory mock store, so changes
// survive closing/reopening the modal for the rest of the session (no backend
// to save to yet — see the module header note above).
export const saveRoomStatuses = async (floor, sectionId, statusByTableId) => {
    const section = (MOCK_ROOMS_BY_FLOOR[floor] || []).find((s) => s.id === sectionId);
    if (!section) return;
    section.tables = section.tables.map((table) =>
        table.id in statusByTableId ? { ...table, status: statusByTableId[table.id] } : table
    );
};
