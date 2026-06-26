import { useEffect, useRef, useState } from "react";

function EntitySelect({
    options,
    value,
    onChange,
    placeholder = "Select",
    icon,
    className = "border rounded-lg",
}) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setOpen(false);
                setSearch("");
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedOption = options.find((option) => String(option.id) === String(value));
    const filteredOptions = options.filter((option) =>
        option.label.toLowerCase().includes(search.toLowerCase())
    );

    const handleSelect = (option) => {
        onChange(option.id);
        setOpen(false);
        setSearch("");
    };

    return (
        <div className="mb-4 relative" ref={containerRef}>
            <div
                className={`flex items-center justify-between px-4 cursor-pointer ${className}`}
                onClick={() => setOpen((prev) => !prev)}
            >
                <span className="w-full bg-transparent py-3 text-sm text-gray-700">
                    {selectedOption ? selectedOption.label : <span className="text-gray-400">{placeholder}</span>}
                </span>
                {icon && <span className="text-gray-500 ml-2">{icon}</span>}
            </div>

            {open && (
                <div className="absolute z-10 mt-2 w-full bg-white border border-gray-200 rounded-md shadow-lg overflow-hidden">
                    <input
                        type="text"
                        autoFocus
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full px-3 py-2 text-sm border-b border-gray-200 outline-none focus:ring-1 focus:ring-blue-400"
                    />
                    <ul>
                        {filteredOptions.map((option) => {
                            const isSelected = String(option.id) === String(value);
                            return (
                                <li
                                    key={option.id}
                                    onClick={() => handleSelect(option)}
                                    className={`px-3 py-2.5 text-sm cursor-pointer ${
                                        isSelected
                                            ? "bg-[#397db9] text-white font-semibold"
                                            : "text-gray-700 hover:bg-gray-100"
                                    }`}
                                >
                                    {option.label}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
}

export default EntitySelect;
