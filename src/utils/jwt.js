export const decodeJwtPayload = (token) => {
    try {
        const payloadB64 = token.split(".")[1];
        const json = atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"));
        return JSON.parse(json);
    } catch {
        return null;
    }
};

export const isTokenExpired = (token) => {
    if (!token) return true;
    const payload = decodeJwtPayload(token);
    if (!payload?.exp) return true;
    return Date.now() >= payload.exp * 1000;
};
