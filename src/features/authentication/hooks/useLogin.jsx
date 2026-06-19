
import { useState } from "react";
import { loginUser } from "../services/authService";

export const useLogin=()=>{
   const [loading,setloading] = useState(false);
   const [error , setError] =useState("");
   const login =async(email,password) => {
    try{
        setloading(true);
        const result=await loginUser({
            email,password
        });
console.log(result);
return result;
    }
   catch(error)
   {
    setError(
        error.response?.data?.message|| "login Failed"
    );
    }finally{
        setloading(false)
    }
   }
return{
   login,loading,error
};
}
