function Placeholder({ title }) {
    return (
        <div className="flex flex-col items-center justify-center text-center py-24 text-gray-500 dark:text-gray-400">
            <h2 className="text-xl font-semibold dark:text-white!">{title}</h2>
            <p className="mt-2 text-sm">This page is coming soon.</p>
        </div>
    );
}

export default Placeholder;
