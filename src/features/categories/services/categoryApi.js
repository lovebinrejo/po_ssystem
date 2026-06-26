import { get } from "../../../services/axios";

export const fetchCategories = async () => {
    const data = await get("/api/pos/categories/index.php");
    return data.categories;
};
