import { useEffect, useState } from "react";
import { fetchTables } from "../services/tableApi";

export const useTables = () => {
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTables()
            .then(setTables)
            .finally(() => setLoading(false));
    }, []);

    return { tables, loading };
};
