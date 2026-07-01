import { useEffect, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { fetchProducts } from "../services/productApi";
import { isCacheReady, searchCachedProducts } from "../../../services/posCache";

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
        // Cache-first, same as legacy's POSCache: instant local filtering once
        // the cache has loaded, falling back to a live server call until then.
        queryFn: () =>
            isCacheReady()
                ? Promise.resolve(searchCachedProducts({ categoryId, search: debouncedSearch }))
                : fetchProducts({ categoryId, search: debouncedSearch }),
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
