
import LoginForm from "../features/authentication/Components/LoginForm";
import { useState } from "react";
import { loginUser } from "../features/authentication/services/authService";
import { useNavigate } from "react-router-dom";

function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error,setError]=useState("");
    const navigate =useNavigate();
    const handleLogin = async() => {
        try{
            const result =await loginUser({ email, password });
            console.log(result);
            setError("");

            if(result.success)
            {
                localStorage.setItem("user",JSON.stringify(result.user));
                localStorage.setItem("token",result.token);
                navigate("/dashboard");
            }
        }
        catch(error)
        {
            setError(error.response?.data?.message ||"login failed");
        }
    };

    return (
        
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
           <div>
           <LoginForm
                email={email}
                password={password}
                setEmail={setEmail}
                setPassword={setPassword}
                onLogin={handleLogin}
            />

            {
                error &&
                (
                    <p className="text-red-500 text-center mt-2">
                        {error}

                    </p>
                )
            }
             </div> 
        </div>
    );
}
export default Login;