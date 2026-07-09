import { useEffect, useRef, useState } from "react";

// Shows as many category chips as fit on one line, tucking the rest behind
// a "more" icon that opens a dropdown — instead of wrapping to extra rows
// or requiring horizontal scroll. Fit is measured against real rendered
// widths (a hidden clone row), not estimated, so it holds up for any mix of
// short/long category names and any container width.
function CategoryTabs({ categories, selectedCategory, onSelect }) {
    const outerRef = useRef(null);
    const containerRef = useRef(null);
    const measureRef = useRef(null);
    const moreRef = useRef(null);
    const [visibleCount, setVisibleCount] = useState(categories.length);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

    useEffect(() => {
        const recalculate = () => {
            const container = containerRef.current;
            const measure = measureRef.current;
            if (!container || !measure) return;

            const containerWidth = container.clientWidth;
            const moreButtonWidth = 60; // reserved space for the "+N" pill, incl. gap
            const buttons = Array.from(measure.children);
            const GAP = 8;

            let usedWidth = 0;
            let count = 0;
            for (let i = 0; i < buttons.length; i++) {
                const btnWidth = buttons[i].offsetWidth + (count > 0 ? GAP : 0);
                const hasMoreAfter = i < buttons.length - 1;
                const budget = containerWidth - (hasMoreAfter ? moreButtonWidth : 0);
                if (usedWidth + btnWidth > budget) break;
                usedWidth += btnWidth;
                count++;
            }
            setVisibleCount(Math.max(count, 1));
        };

        recalculate();
        const resizeObserver = new ResizeObserver(recalculate);
        if (containerRef.current) resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, [categories]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (moreRef.current && !moreRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // The "more" button lives inside a row with overflow-hidden (needed so
    // overflowing chips don't flash before the fit calculation runs), so the
    // dropdown can't be a normal absolutely-positioned child of it — it would
    // get clipped. Render it as a sibling of that row instead, positioned via
    // the button's real on-screen coordinates.
    const openDropdown = () => {
        const btn = moreRef.current;
        const outer = outerRef.current;
        if (btn && outer) {
            const btnRect = btn.getBoundingClientRect();
            const outerRect = outer.getBoundingClientRect();
            setDropdownPos({
                top: btnRect.bottom - outerRect.top + 6,
                left: btnRect.left - outerRect.left,
            });
        }
        setDropdownOpen((v) => !v);
    };

    const visibleCategories = categories.slice(0, visibleCount);
    const hiddenCategories = categories.slice(visibleCount);
    const selectedIsHidden = hiddenCategories.includes(selectedCategory);

    return (
        <div ref={outerRef} className="relative mb-1 pl-0 pr-2 pt-2 pb-1">
            {/* Off-screen clone used only to measure real button widths */}
            <div ref={measureRef} className="absolute -top-96 left-0 flex gap-2 invisible pointer-events-none" aria-hidden="true">
                {categories.map((category) => (
                    <span key={category} className="px-3 py-1.5 text-sm rounded-full whitespace-nowrap font-medium">
                        {category}
                    </span>
                ))}
            </div>

            <div ref={containerRef} className="flex flex-nowrap items-center gap-2 overflow-hidden">
                {visibleCategories.map((category) => (
                    <button
                        key={category}
                        onClick={() => onSelect(category)}
                        className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap shrink-0 transition-colors ${
                            selectedCategory === category
                                ? "bg-[#2c6291] text-white"
                                : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                        }`}
                    >
                        {category}
                    </button>
                ))}

                {hiddenCategories.length > 0 && (
                    <button
                        ref={moreRef}
                        type="button"
                        onClick={openDropdown}
                        aria-label={`${hiddenCategories.length} more categories`}
                        title={`${hiddenCategories.length} more categories`}
                        className={`shrink-0 px-3 py-1.5 text-sm font-semibold rounded-full shadow-sm whitespace-nowrap transition-colors border ${
                            selectedIsHidden
                                ? "bg-[#2c6291] text-white border-[#2c6291]"
                                : "bg-white text-[#397db9] border-[#397db9]/40 hover:bg-[#397db9]/10 dark:bg-gray-800 dark:text-blue-300 dark:border-blue-300/30 dark:hover:bg-gray-700"
                        }`}
                    >
                        +{hiddenCategories.length}
                    </button>
                )}
            </div>

            {dropdownOpen && hiddenCategories.length > 0 && (
                <div
                    className="absolute z-30 min-w-[170px] max-h-72 overflow-y-auto soft-scrollbar rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-xl p-1.5"
                    style={{ top: dropdownPos.top, left: dropdownPos.left }}
                >
                    <div className="flex flex-col gap-0.5">
                        {hiddenCategories.map((category) => (
                            <button
                                key={category}
                                onClick={() => {
                                    onSelect(category);
                                    setDropdownOpen(false);
                                }}
                                className={`px-3 py-2 text-sm rounded-lg text-left whitespace-nowrap transition-colors ${
                                    selectedCategory === category
                                        ? "bg-[#2c6291] text-white font-medium"
                                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                                }`}
                            >
                                {category}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default CategoryTabs;
