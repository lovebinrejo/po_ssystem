// Placeholder data until a legacy-backed endpoint exists. takeposnew/api/tables.php
// is session-cookie auth only (same constraint as customer_ajax.php) and can't be
// called from this app's X-API-Key-based session yet.
const MOCK_TABLES = Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    label: `Table ${i + 1}`,
}));

export const fetchTables = async () => MOCK_TABLES;
