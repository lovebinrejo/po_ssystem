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
    setEmail,
    setPassword,
    setMasterEntity,
    setBackendUrl,
    onLogin
}) {
    return (
        <div className="w-full max-w-sm">
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
                    <p className="text-[11px] text-gray-400 mt-1 ml-3">
                        Backend URL (optional) — a plain base URL works, or paste any legacy POS/API page URL and it's extracted automatically.
                    </p>
                </div>
            </div>
            <Button
                text="LOGIN"
                onclick={onLogin}
                type="button"
                className="mt-6 w-full py-3 rounded-full tracking-widest"
            />
        </div>
    );
}

export default LoginForm;

