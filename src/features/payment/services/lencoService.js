const SCRIPT_ID = "lenco-inline-sdk";

const scriptUrl = () =>
    import.meta.env.VITE_LENCO_SANDBOX === "false"
        ? "https://pay.lenco.co/js/v1/inline.js"
        : "https://pay.sandbox.lenco.co/js/v1/inline.js";

let loadPromise = null;


const loadLencoScript = () => {
    if (window.LencoPay) return Promise.resolve();
    if (loadPromise) return loadPromise;

    loadPromise = new Promise((resolve, reject) => {
        const existing = document.getElementById(SCRIPT_ID);
        if (existing) {
            existing.addEventListener("load", () => resolve());
            existing.addEventListener("error", () => reject(new Error("Failed to load LencoPay SDK")));
            return;
        }

        const script = document.createElement("script");
        script.id = SCRIPT_ID;
        script.src = scriptUrl();
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load LencoPay SDK"));
        document.body.appendChild(script);
    });

    return loadPromise;
};


export const openLencoWidget = async ({
    amount,
    currency,
    email,
    phone,
    firstName,
    lastName,
    reference,
    onSuccess,
    onClose,
}) => {
    const key = import.meta.env.VITE_LENCO_PUBLIC_KEY;
    if (!key) throw new Error("Lenco public key not configured. Set VITE_LENCO_PUBLIC_KEY in .env.");

    await loadLencoScript();
    if (!window.LencoPay) throw new Error("LencoPay SDK not loaded. Please refresh the page.");

    window.LencoPay.getPaid({
        key,
        reference,
        email,
        amount,
        currency,
        channels: ["card", "mobile-money"],
        customer: { firstName, lastName, phone },
        onSuccess,
        onClose,
    });
};
