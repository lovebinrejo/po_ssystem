import { User, KeyRound, Building2, Globe } from "lucide-react";
import Input from "../../../components/inputs/Input";
import EntitySelect from "../../../components/inputs/EntitySelect";
import Button from "../../../components/Buttons/Button";

const ENTITY_OPTIONS = [{ id: 1, label: "Master entity" }];

function LoginForm({
    email,
    password,
    masterEntity,
    backendUrl,
    loading,
    setEmail,
    setPassword,
    setMasterEntity,
    setBackendUrl,
    onLogin,
    onResetBackend
}) {
    const handleSubmit = (e) => {
        e.preventDefault();
        onLogin();
    };

    return (
        <form className="w-full max-w-sm" onSubmit={handleSubmit}>
            <div className="space-y-4">
                <Input
                    name="email"
                    placeholder="Username"
                    value={email}
                    onchange={(e) => setEmail(e.target.value)}
                    icon={<User size={18} />}
                    className="bg-[#e8edf8] rounded-full"
                />
                <Input
                    type="password"
                    name="password"
                    placeholder="Password"
                    value={password}
                    onchange={(e) => setPassword(e.target.value)}
                    icon={<KeyRound size={18} />}
                    className="bg-[#fdf6e3] rounded-full"
                />
                <EntitySelect
                    options={ENTITY_OPTIONS}
                    value={masterEntity}
                    onChange={setMasterEntity}
                    placeholder="Master entity"
                    icon={<Building2 size={18} />}
                    className="bg-white border border-gray-300 rounded-full"
                />
                <div>
                    <Input
                        name="backendUrl"
                        placeholder="e.g. https://demo1.ecuenta.online"
                        value={backendUrl}
                        onchange={(e) => setBackendUrl(e.target.value)}
                        icon={<Globe size={18} />}
                        className="bg-[#eef3f8] rounded-full"
                    />
                    <p className="text-[11px] mt-1 ml-3">
                        {backendUrl ? (
                            <span className="text-amber-600">
                                Overriding this build's default backend —{" "}
                                <button type="button" onClick={onResetBackend} className="underline hover:text-amber-700">
                                    clear it
                                </button>{" "}
                                to use the default again.
                            </span>
                        ) : (
                            <span className="text-gray-400">
                                Backend URL (optional) — a plain base URL works, or paste any legacy POS/API page URL and it's extracted automatically.
                            </span>
                        )}
                    </p>
                </div>
            </div>
            <Button
                text={loading ? "LOGGING IN..." : "LOGIN"}
                type="submit"
                disabled={loading}
                className="mt-6 w-full py-3 rounded-full tracking-widest"
            />
        </form>
    );
}

export default LoginForm;

