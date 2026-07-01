import { useState } from "react";
import { Save, UserPlus, X } from "lucide-react";
import { createCustomer } from "../services/customerApi";

const EMPTY_FORM = {
    name: "",
    tpin: "",
    email: "",
    phone: "",
    address: "",
    zip: "",
    town: "",
    vatUsed: "1",
};

// Mirrors legacy's "Create New Customer" offcanvas form (takeposnew/index.php
// #insert_thirdparty): same fields and same client-side validation rules
// (TPIN exactly 10 digits, valid email, phone >= 9 digits if provided), even
// though the X-API-Key api/customers?action=create endpoint this posts to is
// more lenient server-side than legacy's takeposnew/api/customer.php.
function AddCustomerModal({ open, onClose, onCreated }) {
    const [form, setForm] = useState(EMPTY_FORM);
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    if (!open) return null;

    const update = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

    const handleClose = () => {
        setForm(EMPTY_FORM);
        setError("");
        onClose();
    };

    const handleSubmit = async () => {
        const name = form.name.trim();
        const tpin = form.tpin.trim();
        const email = form.email.trim();

        if (!name) return setError("Customer name is required");
        if (!tpin || tpin.length !== 10) return setError("TPIN must be exactly 10 digits");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError("Please enter a valid email address");
        if (form.phone.trim()) {
            const cleanPhone = form.phone.replace(/[^0-9+]/g, "");
            if (cleanPhone.length < 9) return setError("Invalid phone number format");
        }

        setError("");
        setSubmitting(true);
        try {
            const payload = {
                name,
                tpin,
                email,
                phone: form.phone.trim(),
                address: form.address.trim(),
                zip: form.zip.trim(),
                town: form.town.trim(),
            };
            const customer = await createCustomer(payload);
            // The create response only echoes id/name/email/phone/code_client
            // (unlike list/detail's fuller row) — merge in what we know was
            // actually submitted and saved, so the info card isn't missing
            // fields like TPIN right after creation.
            onCreated({ ...payload, ...customer });
            setForm(EMPTY_FORM);
        } catch (err) {
            setError(err.response?.data?.error || err.message || "Failed to create customer");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] bg-black/60" onClick={handleClose}>
            <div
                onClick={(e) => e.stopPropagation()}
                className="fixed right-0 top-0 h-full w-full max-w-md overflow-y-auto soft-scrollbar bg-white dark:bg-slate-900 text-gray-900 dark:text-white shadow-2xl animate-[slide-in-right_0.25s_ease-out]"
            >
                <div className="flex items-center justify-between px-5 py-3 bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 text-base font-semibold text-[var(--text-navy)] dark:text-white">
                        <UserPlus size={18} />
                        Create New Customer
                    </div>
                    <button type="button" onClick={handleClose} className="text-red-400 hover:text-red-500">
                        <X size={18} />
                    </button>
                </div>

                <div className="px-5 py-4 space-y-4">
                    {error && (
                        <p className="text-sm text-red-600 bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
                    )}

                    <div>
                        <label className="block text-sm mb-1">
                            <span className="text-red-500">*</span> Customer Name
                        </label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={update("name")}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white outline-none focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm mb-1">
                            <span className="text-red-500">*</span> TPIN
                        </label>
                        <input
                            type="text"
                            maxLength={10}
                            value={form.tpin}
                            onChange={update("tpin")}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white outline-none focus:border-blue-500"
                        />
                        {form.tpin && (
                            <p className={`text-xs mt-1 ${form.tpin.length === 10 ? "text-emerald-600" : "text-amber-500"}`}>
                                {form.tpin.length === 10 ? "✓ Valid" : `Must be 10 digits (${10 - form.tpin.length} more needed)`}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm mb-1">
                            <span className="text-red-500">*</span> Email
                        </label>
                        <input
                            type="email"
                            value={form.email}
                            onChange={update("email")}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white outline-none focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm mb-1">Phone</label>
                        <input
                            type="text"
                            value={form.phone}
                            onChange={update("phone")}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white outline-none focus:border-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm mb-1">Address</label>
                        <textarea
                            rows={2}
                            value={form.address}
                            onChange={update("address")}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white outline-none focus:border-blue-500"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm mb-1">Zip Code</label>
                            <input
                                type="text"
                                value={form.zip}
                                onChange={update("zip")}
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white outline-none focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm mb-1">Town</label>
                            <input
                                type="text"
                                value={form.town}
                                onChange={update("town")}
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm mb-1">Country</label>
                        <input
                            disabled
                            value="Zambia"
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-400"
                        />
                    </div>

                    <div>
                        <label className="block text-sm mb-1">VAT Is Used</label>
                        <select
                            value={form.vatUsed}
                            onChange={update("vatUsed")}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white outline-none focus:border-blue-500"
                        >
                            <option value="1">Yes</option>
                            <option value="0">No</option>
                        </select>
                    </div>

                    <button
                        type="button"
                        disabled={submitting}
                        onClick={handleSubmit}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#397db9] hover:bg-[#2c6291] disabled:opacity-50"
                    >
                        <Save size={16} />
                        {submitting ? "Creating..." : "Create Customer"}
                    </button>
                    <button
                        type="button"
                        disabled={submitting}
                        onClick={handleClose}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#397db9] hover:bg-[#2c6291] disabled:opacity-50"
                    >
                        <X size={16} />
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}

export default AddCustomerModal;
