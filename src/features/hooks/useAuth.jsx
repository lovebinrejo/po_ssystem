
import { login } from "../authentication/services/authService";
import useAuthStore from "../authentication/stores/authStore";

export const useAuth=()=>{
    const setuser=useAuthStore((state) => state.setUser)
    const setToken=useAuthStore((state) => state.setToken)
    const handling =async payload => {
        try{
            const response =await login(payload);
            setuser(response.user);
            setToken(response.token);
        }
        catch(error)
        {
            console.error("Login failed",error);
        }
    }
return{
    handlelogin:handling
}
};
