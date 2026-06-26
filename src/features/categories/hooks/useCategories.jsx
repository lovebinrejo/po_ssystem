import { useEffect, useState } from "react";
import { fetchCategories } from "../services/categoryApi";

export const useCategories = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;

        fetchCategories()
            .then((data) => {
                if (!cancelled) setCategories(data);
            })
            .catch((err) => {
                if (!cancelled) setError(err.response?.data?.message || "Failed to load categories");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    return { categories, loading, error };
};
