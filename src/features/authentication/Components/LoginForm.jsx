import Input from "../../../components/inputs/Input";
import Button from "../../../components/Buttons/Button";

function LoginForm({
    email,
    password,
    setEmail,
    setPassword,
    onLogin
}) {
    return (
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
            <h2 className="text-2xl font-bold mb-6 text-center">
                Login
            </h2>
            <Input
                label="Email"
                type="email"
                name="email"
                placeholder="Enter your email"
                value={email}
                onchange={(e) => setEmail(e.target.value)}
            />
            <Input
                label="Password"
                type="password"
                name="password"
                placeholder="Enter your password"
                value={password}
                onchange={(e) => setPassword(e.target.value)}
            />
            <Button text="Login" onclick={onLogin} type="button" />
        </div>
    );
}

export default LoginForm;

