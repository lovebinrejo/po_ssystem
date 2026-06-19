
import apiclient from "../../../services/apiClient";

export const loginUser=async (data) => {
    const response=await apiclient.post("/auth/login",data);
return response.data
};
