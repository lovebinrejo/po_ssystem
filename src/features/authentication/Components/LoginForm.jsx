

import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";

function LoginForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const { handlelogin } = useAuth();

    const submitHandler = (e) => {
        e.preventDefault();
        handlelogin({ email, password });
    };

    return (
        <form onSubmit={submitHandler}>
            <input type='text' placeholder='email' value={email} onChange={(e) => setEmail(e.target.value)} />
            <input type='password' placeholder='password' value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type='submit'>login</button>
        </form>
    );
}

export default LoginForm;
