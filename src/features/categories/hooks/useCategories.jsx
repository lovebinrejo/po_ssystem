import { useQuery } from "@tanstack/react-query";
import { fetchCategories } from "../services/categoryApi";

export const useCategories = () => {
    const { data, isLoading, error } = useQuery({
        queryKey: ["categories"],
        queryFn: fetchCategories,
        staleTime: 5 * 60_000,
    });

    return {
        categories: data ?? [],
        loading: isLoading,
        error: error ? error.response?.data?.message || error.message || "Failed to load categories" : "",
    };
};
