import { useCustomers } from "../hooks/useCustomers";
import useCustomerStore from "../stores/customerStore";

const getInitials = (name = "") =>
    name
        .trim()
        .split(" ")
        .slice(0, 2)
        .map((w) => w.charAt(0).toUpperCase())
        .join("");

function CustomerSelector() {
    const { customers } = useCustomers();
    const selectedCustomer = useCustomerStore((state) => state.selectedCustomer);
    const setSelectedCustomer = useCustomerStore((state) => state.setSelectedCustomer);

    const handleChange = (e) => {
        const customer = customers.find((c) => String(c.id) === e.target.value);
        if (customer) setSelectedCustomer(customer);
    };

    return (
        <div>
            <select
                value={selectedCustomer?.id ?? ""}
                onChange={handleChange}
                className="w-full bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-blue-200 text-[10px] sm:text-sm rounded-md sm:rounded-lg px-1.5 sm:px-3 py-1.5 sm:py-2.5 border border-gray-300 dark:border-slate-700 outline-none focus:border-blue-500 cursor-pointer"
            >
                {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                        {customer.name} (TPIN: {customer.tpin})
                    </option>
                ))}
            </select>

            {selectedCustomer && (
                <div className="mt-1.5 sm:mt-3 flex items-center gap-1.5 sm:gap-3 bg-gray-50 dark:bg-slate-800/70 rounded-lg sm:rounded-xl p-1.5 sm:p-3">
                    <div className="w-6 h-6 sm:w-10 sm:h-10 rounded-full bg-pink-600 text-white flex items-center justify-center text-[10px] sm:text-base font-semibold shrink-0">
                        {getInitials(selectedCustomer.name)}
                    </div>
                    <div className="min-w-0">
                        <div className="text-gray-900 dark:text-white text-[10px] sm:text-sm font-medium truncate">{selectedCustomer.name}</div>
                        <div className="text-gray-500 dark:text-slate-400 text-[9px] sm:text-xs truncate">TPIN: {selectedCustomer.tpin}</div>
                        {selectedCustomer.email && (
                            <div className="hidden sm:block text-gray-400 dark:text-slate-500 text-xs truncate">{selectedCustomer.email}</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default CustomerSelector;
