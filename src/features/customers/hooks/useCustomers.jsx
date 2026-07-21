import { useEffect, useState } from "react";
import { fetchCustomers } from "../services/customerApi";
import { isCacheReady, searchCachedCustomers } from "../../../services/posCache";

const MIN_SEARCH_LENGTH = 2;
const DEBOUNCE_MS = 250;


export const useCustomers = (search = "") => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (search.trim().length < MIN_SEARCH_LENGTH) {
            setCustomers([]);
            setLoading(false);
            setError("");
            return;
        }

        if (isCacheReady()) {
            setCustomers(searchCachedCustomers(search));
            setLoading(false);
            setError("");
            return;
        }

        let cancelled = false;
        setLoading(true);
        const timer = setTimeout(() => {
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
        }, DEBOUNCE_MS);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [search]);

    return { customers, loading, error };
};
