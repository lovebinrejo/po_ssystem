import { useEffect, useState } from "react";
import { fetchProducts } from "../services/productApi";

export const useProducts = ({ categoryId, search } = {}) => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;
        setLoading(true);

        fetchProducts({ categoryId, search })
            .then((data) => {
                if (!cancelled) setProducts(data);
            })
            .catch((err) => {
                if (!cancelled) setError(err.response?.data?.message || "Failed to load products");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [categoryId, search]);

    return { products, loading, error };
};
