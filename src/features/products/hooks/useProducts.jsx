import { useEffect, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { fetchProducts } from "../services/productApi";

// Debounce the search term before it hits the query key, so typing doesn't
// fire one request per keystroke (was the main cause of the product grid
// flickering while a cashier typed).
const useDebouncedValue = (value, delay) => {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const handle = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(handle);
    }, [value, delay]);

    return debounced;
};

export const useProducts = ({ categoryId, search } = {}) => {
    const debouncedSearch = useDebouncedValue(search, 300);

    const { data, isLoading, error } = useQuery({
        queryKey: ["products", categoryId ?? "all", debouncedSearch ?? ""],
        queryFn: () => fetchProducts({ categoryId, search: debouncedSearch }),
        // Keeps showing the previous category/search's products while the new
        // ones load, instead of unmounting the grid to a blank "Loading..." state.
        placeholderData: keepPreviousData,
    });

    return {
        products: data ?? [],
        loading: isLoading,
        error: error ? error.response?.data?.message || error.message || "Failed to load products" : "",
    };
};
