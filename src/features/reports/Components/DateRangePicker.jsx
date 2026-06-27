import { useEffect, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_LABELS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const fmt = (d) => `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
const sameDay = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);

const PRESETS = (today) => [
    { label: "Today", range: () => [startOfDay(today), startOfDay(today)] },
    { label: "Yesterday", range: () => [startOfDay(addDays(today, -1)), startOfDay(addDays(today, -1))] },
    { label: "Last 7 Days", range: () => [startOfDay(addDays(today, -6)), startOfDay(today)] },
    { label: "Last 30 Days", range: () => [startOfDay(addDays(today, -29)), startOfDay(today)] },
    { label: "This Month", range: () => [startOfMonth(today), endOfMonth(today)] },
    {
        label: "Last Month",
        range: () => {
            const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            return [startOfMonth(lastMonth), endOfMonth(lastMonth)];
        },
    },
];

const getMonthCells = (year, month) => {
    const firstOfMonth = new Date(year, month, 1);
    const startDayIdx = firstOfMonth.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const cells = [];

    for (let i = startDayIdx - 1; i >= 0; i--) {
        cells.push({ date: new Date(year, month - 1, daysInPrevMonth - i), outside: true });
    }
    for (let d = 1; d <= daysInMonth; d++) {
        cells.push({ date: new Date(year, month, d), outside: false });
    }
    let next = 1;
    while (cells.length < 42) {
        cells.push({ date: new Date(year, month + 1, next), outside: true });
        next++;
    }
    return cells;
};

function MonthGrid({ year, month, draftStart, draftEnd, onPick }) {
    const cells = getMonthCells(year, month);
    return (
        <table className="w-full text-xs select-none">
            <thead>
                <tr>
                    {DAY_LABELS.map((d) => (
                        <th key={d} className="font-medium text-gray-400 dark:text-slate-500 pb-1.5">
                            {d}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {Array.from({ length: 6 }).map((_, row) => (
                    <tr key={row}>
                        {cells.slice(row * 7, row * 7 + 7).map(({ date, outside }) => {
                            const isStart = sameDay(date, draftStart);
                            const isEnd = sameDay(date, draftEnd);
                            const inRange = draftStart && draftEnd && date > draftStart && date < draftEnd;
                            return (
                                <td key={date.toISOString()} className="p-0.5 text-center">
                                    <button
                                        type="button"
                                        onClick={() => onPick(date)}
                                        className={`w-7 h-7 rounded-full text-xs transition-colors ${
                                            outside
                                                ? "text-gray-300 dark:text-slate-600"
                                                : "text-gray-700 dark:text-slate-200"
                                        } ${
                                            isStart || isEnd
                                                ? "bg-blue-600 text-white font-semibold"
                                                : inRange
                                                ? "bg-blue-100 dark:bg-blue-500/20"
                                                : "hover:bg-gray-100 dark:hover:bg-slate-700"
                                        }`}
                                    >
                                        {date.getDate()}
                                    </button>
                                </td>
                            );
                        })}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function DateRangePicker({ startDate, endDate, onApply }) {
    const [open, setOpen] = useState(false);
    const [draftStart, setDraftStart] = useState(startDate);
    const [draftEnd, setDraftEnd] = useState(endDate);
    const [pickingStart, setPickingStart] = useState(true);
    const [activePreset, setActivePreset] = useState("Custom Range");
    const [leftMonth, setLeftMonth] = useState(startOfMonth(startDate));
    const [rightMonth, setRightMonth] = useState(new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1));
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const openPicker = () => {
        setDraftStart(startDate);
        setDraftEnd(endDate);
        const left = startOfMonth(startDate);
        setLeftMonth(left);
        setRightMonth(new Date(left.getFullYear(), left.getMonth() + 1, 1));
        setPickingStart(true);
        setActivePreset("Custom Range");
        setOpen(true);
    };

    const handlePick = (date) => {
        setActivePreset("Custom Range");
        if (pickingStart) {
            setDraftStart(date);
            setDraftEnd(null);
            setPickingStart(false);
        } else if (date < draftStart) {
            setDraftStart(date);
            setDraftEnd(draftStart);
            setPickingStart(true);
        } else {
            setDraftEnd(date);
            setPickingStart(true);
        }
    };

    const handlePreset = (preset) => {
        setActivePreset(preset.label);
        const [s, e] = preset.range();
        setDraftStart(s);
        setDraftEnd(e);
        const left = startOfMonth(s);
        setLeftMonth(left);
        setRightMonth(new Date(left.getFullYear(), left.getMonth() + 1, 1));
        setPickingStart(true);
    };

    const handleApply = () => {
        if (draftStart && draftEnd) {
            onApply(draftStart, draftEnd);
            setOpen(false);
        }
    };

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                onClick={() => (open ? setOpen(false) : openPicker())}
                className="flex items-center gap-2 text-sm rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 outline-none hover:border-blue-400 min-w-[230px]"
            >
                <Calendar size={14} className="text-blue-500 shrink-0" />
                <span>{fmt(startDate)}-{fmt(endDate)}</span>
            </button>

            {open && (
                <div className="absolute z-20 mt-1 left-0 flex rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
                    <div className="w-36 shrink-0 border-r border-gray-200 dark:border-slate-700 py-1">
                        {PRESETS(new Date()).map((p) => (
                            <button
                                key={p.label}
                                type="button"
                                onClick={() => handlePreset(p)}
                                className={`block w-full text-left text-xs px-3 py-2 ${
                                    activePreset === p.label
                                        ? "bg-blue-600 text-white"
                                        : "text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800"
                                }`}
                            >
                                {p.label}
                            </button>
                        ))}
                        <button
                            type="button"
                            onClick={() => setActivePreset("Custom Range")}
                            className={`block w-full text-left text-xs px-3 py-2 ${
                                activePreset === "Custom Range"
                                    ? "bg-blue-600 text-white"
                                    : "text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800"
                            }`}
                        >
                            Custom Range
                        </button>
                    </div>

                    <div className="p-3">
                        <div className="flex gap-4">
                            <div className="w-56">
                                <div className="flex items-center justify-between mb-2">
                                    <button
                                        type="button"
                                        onClick={() => setLeftMonth(new Date(leftMonth.getFullYear(), leftMonth.getMonth() - 1, 1))}
                                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <span className="text-sm font-medium">
                                        {MONTH_LABELS[leftMonth.getMonth()]} {leftMonth.getFullYear()}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setLeftMonth(new Date(leftMonth.getFullYear(), leftMonth.getMonth() + 1, 1))}
                                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                                <MonthGrid
                                    year={leftMonth.getFullYear()}
                                    month={leftMonth.getMonth()}
                                    draftStart={draftStart}
                                    draftEnd={draftEnd}
                                    onPick={handlePick}
                                />
                            </div>

                            <div className="w-56">
                                <div className="flex items-center justify-between mb-2">
                                    <button
                                        type="button"
                                        onClick={() => setRightMonth(new Date(rightMonth.getFullYear(), rightMonth.getMonth() - 1, 1))}
                                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <span className="text-sm font-medium">
                                        {MONTH_LABELS[rightMonth.getMonth()]} {rightMonth.getFullYear()}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setRightMonth(new Date(rightMonth.getFullYear(), rightMonth.getMonth() + 1, 1))}
                                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                                <MonthGrid
                                    year={rightMonth.getFullYear()}
                                    month={rightMonth.getMonth()}
                                    draftStart={draftStart}
                                    draftEnd={draftEnd}
                                    onPick={handlePick}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-slate-700">
                            <span className="text-sm text-gray-600 dark:text-slate-300">
                                {draftStart ? fmt(draftStart) : "..."}-{draftEnd ? fmt(draftEnd) : "..."}
                            </span>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setOpen(false)}
                                    className="px-3 py-1.5 rounded text-xs font-medium bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={!draftStart || !draftEnd}
                                    onClick={handleApply}
                                    className="px-3 py-1.5 rounded text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 disabled:opacity-40"
                                >
                                    Apply
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DateRangePicker;
