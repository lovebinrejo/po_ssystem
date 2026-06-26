function ProductsTable({ products }) {
    if (products.length === 0) {
        return <p className="text-sm text-gray-500 dark:text-gray-400">No products found.</p>;
    }

    return (
        <div className="overflow-x-auto border rounded-lg dark:border-gray-700">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                    <tr>
                        <th className="px-4 py-2 font-medium">Photo</th>
                        <th className="px-4 py-2 font-medium">Ref</th>
                        <th className="px-4 py-2 font-medium">Name</th>
                        <th className="px-4 py-2 font-medium">Barcode</th>
                        <th className="px-4 py-2 font-medium text-right">Price</th>
                        <th className="px-4 py-2 font-medium text-right">Stock</th>
                        <th className="px-4 py-2 font-medium">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {products.map((product) => (
                        <tr key={product.id} className="dark:text-gray-200">
                            <td className="px-4 py-2">
                                {product.image && (
                                    <img src={product.image} alt={product.name} className="w-10 h-10 object-cover rounded" />
                                )}
                            </td>
                            <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{product.ref}</td>
                            <td className="px-4 py-2 font-medium">{product.name}</td>
                            <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{product.barcode || "—"}</td>
                            <td className="px-4 py-2 text-right">{product.price.toFixed(2)} ZMW</td>
                            <td className="px-4 py-2 text-right">{product.stock}</td>
                            <td className="px-4 py-2">
                                <span
                                    className={`px-2 py-0.5 rounded-full text-xs ${
                                        product.available
                                            ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                            : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                                    }`}
                                >
                                    {product.available ? "Available" : "Unavailable"}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default ProductsTable;
