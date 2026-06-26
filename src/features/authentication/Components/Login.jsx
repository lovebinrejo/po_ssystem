import { useState } from "react";
import { useNavigate } from "react-router-dom";
import LoginForm from "./LoginForm";
import { useLogin } from "../hooks/useLogin";
import SocialIcon from "../../../components/SocialIcon";
import logo from "../../../assets/Ecuenta_logo_png.png";
import panelBg from "../../../assets/img.png";

const HEADING = [
    { ch: "W" }, { ch: "e" }, { ch: "l" }, { ch: "c" }, { ch: "o" }, { ch: "m" }, { ch: "e" },
    { ch: "t", yellow: true }, { ch: "o", yellow: true },
    { ch: "E" }, { ch: "C" }, { ch: "U" }, { ch: "E" }, { ch: "N" }, { ch: "T" }, { ch: "A" },
];

function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [masterEntity, setMasterEntity] = useState(1);
    const navigate = useNavigate();
    const { login, error } = useLogin();

    const handleLogin = async () => {
        try {
            const result = await login(email, password, masterEntity);
            if (result.success) {
                navigate("/pos");
            }
        } catch {
            // error is already captured by useLogin and rendered below
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#eef3f8] p-10">
            <div className="flex w-full max-w-[1210px] min-h-[585px] bg-white shadow-xl overflow-hidden font-[var(--font-app)]">
                <div
                    className="relative hidden md:flex md:w-2/5 flex-col justify-between p-10 text-white overflow-hidden"
style={{
  backgroundImage: `url(${panelBg})`,
  backgroundSize: "100% 100%",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat"

}}
                >
                    <div className="relative z-10 text-left flex-1 flex flex-col items-start justify-center">
                        <h1 className="waviy font-bold leading-snug text-2xl! tracking-[5px]! uppercase">
                            {HEADING.map(({ ch, yellow }, i) => (
                                <span
                                    key={i}
                                    style={{ "--i": i + 1 }}
                                    className={yellow ? "text-black!" : "text-white!"}
                                >
                                    {ch}
                                </span>
                            ))}
                        </h1>
                        <p className="mt-4 text-sm text-blue-100 max-w-xs">
                            Seamless access to Smart Invoicing, ZRA tax filing, POS, and payroll tools in one secure platform.
                        </p>
                    </div>

                    <div className="relative z-10 flex gap-3 justify-start">
                        {["twitter", "facebook", "instagram", "linkedin", "pinterest"].map((name) => (
                            <a
                                key={name}
                                href="#"
                                className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-[#397db9] hover:bg-blue-50"
                            >
                                <SocialIcon name={name} />
                            </a>
                        ))}
                    </div>
                </div>

                <div className="w-full md:w-3/5 p-10 flex flex-col items-center justify-center">
                   <div>
                    <div className="mb-2">
                        <img src={logo} alt="Ecuenta" className="h-15" />


                    </div>
                     <h2 className="text-lg text-[var(--text-navy)] mt-[10px]! mb-[20px]!">Sign Into Your Account</h2>
                    </div>

                    <LoginForm
                        email={email}
                        password={password}
                        masterEntity={masterEntity}
                        setEmail={setEmail}
                        setPassword={setPassword}
                        setMasterEntity={setMasterEntity}
                        onLogin={handleLogin}
                    />

                    {
                        error &&
                        (
                            <p className="text-red-500 text-sm text-center mt-3">
                                {error}
                            </p>
                        )
                    }
                </div>
            </div>
        </div>
    );
}
export default Login;
