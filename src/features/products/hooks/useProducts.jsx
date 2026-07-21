import { useEffect, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { fetchProducts } from "../services/productApi";


const MIN_SEARCH_LENGTH = 2;


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
    
    const effectiveSearch = debouncedSearch.trim().length >= MIN_SEARCH_LENGTH ? debouncedSearch : "";

    const { data, isLoading, error } = useQuery({
        queryKey: ["products", categoryId ?? "all", effectiveSearch],
       
        queryFn: () => fetchProducts({ categoryId, search: effectiveSearch }),
       
        placeholderData: keepPreviousData,
    });

    return {
        products: data ?? [],
        loading: isLoading,
        error: error ? error.response?.data?.message || error.message || "Failed to load products" : "",
    };
};
