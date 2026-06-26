function CategoryTabs({ categories, selectedCategory, onSelect }) {
    return (
        <div className="flex gap-2 mb-4 overflow-x-auto soft-scrollbar">
            {categories.map((category) => (
                <button
                    key={category}
                    onClick={() => onSelect(category)}
                    className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap ${
                        selectedCategory === category
                            ? "bg-[#397db9] text-white"
                            : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    }`}
                >
                    {category}
                </button>
            ))}
        </div>
    );
}

export default CategoryTabs;
