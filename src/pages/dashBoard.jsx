import { useNavigate } from "react-router-dom";
function Dashboard()
{
    const navigate = useNavigate();
    const logout=()=>{
        localStorage.removeItem("user");
        navigate('/');
    }
    const stored = localStorage.getItem("user");
    let user;
    try {
        user = stored ? JSON.parse(stored) : null;
    } catch {
        user = null;
    }
    return(
        <div className="p-10">
            <h1 className ="text-3xl font-bold">
                DashBoard
            </h1>

            <h1>
            Welcome {user?.username}
            </h1>
            <p>
                Email:{user?.email}
            </p>
            <p>
                Role:{user?.role}
            </p>
            <button onClick={logout} className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
                Logout
            </button>
        </div>
    )
}
export default Dashboard;