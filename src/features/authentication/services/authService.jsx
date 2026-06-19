
import apiclient from "../../../services/apiClient";

export const login=async (payload) => {
    const response=await apiclient.post("/auth/login",payload);
return response.data
};
