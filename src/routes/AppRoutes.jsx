import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "../features/authentication/Components/Login";
import PosHome from "../features/pos/Components/PosHome";
import ProductsPage from "../features/products/Components/ProductsPage";
import Placeholder from "../pages/Placeholder";
import ProtectedRoute from "./ProtectedRoute";
import DashboardLayout from "../layouts/DashboardLayout";

const PLACEHOLDER_ROUTES = [
    { path: "/zra", title: "Zra" },
    { path: "/sales", title: "Sales" },
    { path: "/purchases", title: "Purchases" },
    { path: "/warehouses", title: "Warehouses" },
    { path: "/projects", title: "Projects" },
    { path: "/banking", title: "Banking" },
    { path: "/users", title: "Users" },
    { path: "/payroll", title: "Payroll" },
    { path: "/expenses", title: "Expenses" },
    { path: "/budget", title: "Budget" },
    { path: "/procurement", title: "Procurement" },
    { path: "/hotel", title: "Hotel" },
    { path: "/kitchen", title: "Kitchen" },
    { path: "/fixed-asset", title: "Fixed Asset" },
    { path: "/general-ledger", title: "General Ledger" },
    { path: "/ticket", title: "Ticket" },
    { path: "/administrator", title: "Administrator" },
    { path: "/production", title: "Production" },
    { path: "/reports", title: "Reports" },
];

function AppRoutes() {
    return (
        <BrowserRouter basename={import.meta.env.BASE_URL}>
            <Routes>
                <Route path="/" element={<Navigate to="/pos" />} />
                <Route path="/login" element={<Login />} />
                <Route
                    element={
                        <ProtectedRoute>
                            <DashboardLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route path="/pos" element={<PosHome />} />
                    <Route path="/products" element={<ProductsPage />} />
                    <Route path="/home" element={<Navigate to="/pos" replace />} />
                    {PLACEHOLDER_ROUTES.map(({ path, title }) => (
                        <Route key={path} path={path} element={<Placeholder title={title} />} />
                    ))}
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default AppRoutes;
