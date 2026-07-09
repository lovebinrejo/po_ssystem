import useAuthStore from "../features/authentication/stores/authStore";

// A 401 from any api/pos/* call means the current token no longer matches
// what the backend (and whatever DB its conf.php is pointed at) considers
// valid — e.g. the legacy system's DB was swapped/restored underneath us.
// Legacy's own UI always re-authenticates fresh against whatever DB is live;
// this is the standalone app's equivalent — drop the stale session and send
// the user back to a real login instead of continuing to run against a
// session the backend already rejected.
export const handleUnauthorized = () => {
    useAuthStore.getState().logout();
    if (window.location.pathname !== "/login") {
        window.location.href = "/login";
    }
};
