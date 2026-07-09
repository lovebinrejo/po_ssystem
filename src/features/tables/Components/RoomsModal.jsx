import { useEffect, useState } from "react";
import { ArrowLeft, Building2, Check, DoorOpen, Pencil, Save, X } from "lucide-react";
import { fetchRooms, saveRoomStatuses, FLOOR_COUNT } from "../services/roomApi";
import { STATUS_META, STATUS_ORDER } from "../statusMeta";
import useTableStore from "../stores/tableStore";
import Toast from "../../../components/Toast";

function RoomsModal({ open, onClose }) {
    const [floor, setFloor] = useState(1);
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [pendingChanges, setPendingChanges] = useState({});
    const [savedToast, setSavedToast] = useState(false);
    const selectedTable = useTableStore((state) => state.selectedTable);
    const selectTable = useTableStore((state) => state.selectTable);

    useEffect(() => {
        if (!open) return;
        setLoading(true);
        fetchRooms(floor).then((data) => {
            setRooms(data);
            setLoading(false);
        });
    }, [open, floor]);

    useEffect(() => {
        if (open) {
            setFloor(1);
            setSelectedRoom(null);
            setEditMode(false);
            setPendingChanges({});
            setSavedToast(false);
        }
    }, [open]);

    const handleFloorChange = (f) => {
        setFloor(f);
        setSelectedRoom(null);
        setEditMode(false);
        setPendingChanges({});
    };

    const backToRoomList = () => {
        setSelectedRoom(null);
        setEditMode(false);
        setPendingChanges({});
    };

    if (!open) return null;

    const roomSummary = (room) => {
        const available = room.tables.filter((t) => t.status === "available").length;
        return `${available}/${room.tables.length} available`;
    };

    const handleSelectTable = (table) => {
        if (table.status !== "available") return;
        selectTable({ id: `${selectedRoom?.id}-${table.id}`, label: `${selectedRoom?.label} / ${table.label}` });
        onClose();
    };

    const handleTileClick = (table) => {
        if (!editMode) {
            handleSelectTable(table);
            return;
        }
        const current = pendingChanges[table.id] ?? table.status;
        const nextIndex = (STATUS_ORDER.indexOf(current) + 1) % STATUS_ORDER.length;
        setPendingChanges((prev) => ({ ...prev, [table.id]: STATUS_ORDER[nextIndex] }));
    };

    const handleCancelEdit = () => {
        setEditMode(false);
        setPendingChanges({});
    };

    const handleSaveChanges = async () => {
        await saveRoomStatuses(floor, selectedRoom?.id, pendingChanges);
        setSelectedRoom((room) => ({
            ...room,
            tables: room.tables.map((table) =>
                table.id in pendingChanges ? { ...table, status: pendingChanges[table.id] } : table
            ),
        }));
        setPendingChanges({});
        setEditMode(false);
        setSavedToast(true);
        setTimeout(() => setSavedToast(false), 2500);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden rounded-2xl bg-white dark:bg-slate-900 shadow-2xl">
                <div className="shrink-0 flex items-center justify-between px-6 py-2.5 bg-[#2c6291] text-white">
                    <div className="flex items-center gap-2.5 text-lg font-semibold">
                        {selectedRoom ? (
                            <button type="button" onClick={backToRoomList} className="p-1 rounded hover:bg-white/20 -ml-1">
                                <ArrowLeft size={20} />
                            </button>
                        ) : (
                            <Building2 size={20} />
                        )}
                        {selectedRoom ? selectedRoom.label : "Rooms"}
                        {editMode && (
                            <span className="text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 rounded-full bg-amber-400 text-amber-950">
                                Editing
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1.5">
                        {selectedRoom && !editMode && (
                            <button
                                type="button"
                                onClick={() => setEditMode(true)}
                                title="Edit room statuses"
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/15 hover:bg-white/25"
                            >
                                <Pencil size={13} />
                                Edit
                            </button>
                        )}
                        <button type="button" onClick={onClose} className="p-1 rounded hover:bg-white/20">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <Toast message={savedToast ? "Room statuses saved" : null} />

                {!selectedRoom && (
                    <div className="shrink-0 flex items-center gap-1.5 px-6 py-3 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/60">
                        {Array.from({ length: FLOOR_COUNT }).map((_, i) => {
                            const f = i + 1;
                            return (
                                <button
                                    key={f}
                                    type="button"
                                    onClick={() => handleFloorChange(f)}
                                    className={`px-3.5 py-1.5 rounded-full text-sm font-semibold transition-colors cursor-pointer ${
                                        floor === f
                                            ? "bg-[#2c6291] text-white shadow-sm"
                                            : "bg-white dark:bg-slate-700 text-gray-600 dark:text-slate-300 border border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-600"
                                    }`}
                                >
                                    Floor {f}
                                </button>
                            );
                        })}
                    </div>
                )}

                <div className="flex-1 min-h-[220px] overflow-y-auto soft-scrollbar p-6">
                    {loading ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="h-28 rounded-2xl bg-gray-100 dark:bg-slate-800 animate-pulse" />
                            ))}
                        </div>
                    ) : selectedRoom ? (
                        <>
                            {/* Legend */}
                            <div className="flex items-center gap-4 mb-4 px-1 text-xs font-medium text-gray-500 dark:text-slate-400">
                                {Object.entries(STATUS_META).map(([key, meta]) => (
                                    <span key={key} className="flex items-center gap-1.5">
                                        <span className={`w-2.5 h-2.5 rounded-full ${meta.badge}`} />
                                        {meta.label}
                                    </span>
                                ))}
                            </div>

                            {editMode && (
                                <p className="text-xs text-gray-500 dark:text-slate-400 mb-3 -mt-1">
                                    Click a room to cycle its status, then Save Changes.
                                </p>
                            )}

                            {/* Floor-plan grid: a fixed 7 rooms per row, mirroring legacy takeposnew's
                                #tablesContainer / .pos-table tile styling. */}
                            <div className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-800 dark:to-slate-900 p-4">
                                <div className="grid grid-cols-7 gap-3">
                                    {selectedRoom.tables.map((table) => {
                                        const effectiveStatus = pendingChanges[table.id] ?? table.status;
                                        const isDirty = table.id in pendingChanges;
                                        const isSelectable = !editMode && effectiveStatus === "available";
                                        const isSelected = !editMode && selectedTable?.id === `${selectedRoom?.id}-${table.id}`;
                                        const meta = STATUS_META[effectiveStatus] || STATUS_META.available;
                                        const StatusIcon = meta.icon;

                                        return (
                                            <button
                                                key={table.id}
                                                type="button"
                                                disabled={!editMode && !isSelectable}
                                                onClick={() => handleTileClick(table)}
                                                className={`relative flex flex-col items-center justify-center gap-1.5 aspect-square rounded-2xl bg-white dark:bg-slate-800 border-[3px] shadow-md transition-all ${meta.border} ${
                                                    isSelected
                                                        ? "ring-2 ring-[#2c6291] ring-offset-2 ring-offset-blue-50 dark:ring-offset-slate-900"
                                                        : isDirty
                                                        ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-blue-50 dark:ring-offset-slate-900"
                                                        : ""
                                                } ${
                                                    editMode
                                                        ? "cursor-pointer hover:-translate-y-1 hover:shadow-xl"
                                                        : isSelectable
                                                        ? `cursor-pointer hover:-translate-y-1 hover:shadow-xl ${meta.glow}`
                                                        : "cursor-not-allowed opacity-90"
                                                }`}
                                            >
                                                {isDirty && (
                                                    <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-white dark:border-slate-800" />
                                                )}
                                                {isSelected ? (
                                                    <span className="w-6 h-6 flex items-center justify-center rounded-full bg-[#2c6291] text-white">
                                                        <Check size={13} />
                                                    </span>
                                                ) : StatusIcon ? (
                                                    <StatusIcon size={16} className="text-gray-500 dark:text-slate-400" />
                                                ) : null}
                                                <span className="font-bold uppercase tracking-wide text-xs text-gray-800 dark:text-slate-100">
                                                    {table.label}
                                                </span>
                                                <span className={`text-[8px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full text-white ${meta.badge}`}>
                                                    {meta.label}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    ) : rooms.length === 0 ? (
                        <div className="flex flex-col items-center justify-center text-center py-16 text-gray-400 dark:text-slate-500">
                            <DoorOpen size={56} className="mb-4 opacity-50" />
                            <h4 className="text-lg font-semibold text-gray-600 dark:text-slate-300">No Rooms Found</h4>
                            <p className="text-sm mt-1">No rooms configured for Floor {floor}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {rooms.map((room) => (
                                <button
                                    key={room.id}
                                    type="button"
                                    onClick={() => setSelectedRoom(room)}
                                    className="group flex flex-col items-center justify-center gap-2 h-28 rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-100 cursor-pointer transition-all hover:-translate-y-1 hover:border-[#2c6291] hover:shadow-lg"
                                >
                                    <div className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-100 text-[#2c6291] dark:bg-blue-500/10 dark:text-blue-300 group-hover:bg-[#2c6291] group-hover:text-white transition-colors">
                                        <Building2 size={18} />
                                    </div>
                                    <span className="font-semibold">{room.label}</span>
                                    <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-300">
                                        {roomSummary(room)}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="shrink-0 flex items-center justify-end gap-2 px-6 py-3 border-t border-gray-200 dark:border-slate-700">
                    {editMode ? (
                        <>
                            <button
                                type="button"
                                onClick={handleCancelEdit}
                                className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-700"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveChanges}
                                disabled={Object.keys(pendingChanges).length === 0}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <Save size={14} />
                                Save Changes
                            </button>
                        </>
                    ) : (
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-700"
                        >
                            Close
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default RoomsModal;
