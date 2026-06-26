import { useEffect, useState } from "react";
import { fetchCustomers } from "../services/customerApi";

export const useCustomers = (search = "") => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        fetchCustomers(search)
            .then((data) => {
                if (!cancelled) setCustomers(data);
            })
            .catch(() => {
                if (!cancelled) setError("Failed to load customers");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [search]);

    return { customers, loading, error };
};
