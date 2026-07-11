import { useEffect, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { fetchProducts } from "../services/productApi";

// Legacy's searchProducts() ignores anything under 2 characters and just
// reloads the current category unfiltered ("if (!term || term.length < 2)")
// — same threshold pos_standalone's own customer search already uses
// (useCustomers.jsx), just not previously applied to products too.
const MIN_SEARCH_LENGTH = 2;

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
    // Below the minimum, treat it the same as no search term at all (shows
    // the current category unfiltered) rather than filtering on a 1-character
    // fragment — matches legacy exactly, including for the current category's
    // full list rather than an empty result.
    const effectiveSearch = debouncedSearch.trim().length >= MIN_SEARCH_LENGTH ? debouncedSearch : "";

    const { data, isLoading, error } = useQuery({
        queryKey: ["products", categoryId ?? "all", effectiveSearch],
        // Always live — matches useCategories.jsx, which never reads from
        // posCache either. The IndexedDB cache (posCache.js) still exists for
        // customers and still backs the Sync Data button, but product loading
        // no longer reads from it.
        queryFn: () => fetchProducts({ categoryId, search: effectiveSearch }),
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
