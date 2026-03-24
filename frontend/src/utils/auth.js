import { jwtDecode } from "jwt-decode";

export function getToken() {
    return localStorage.getItem("token");
}

export function getUserRole() {

    const token = getToken();
    if (!token)
        return null;

    const decoded = jwtDecode(token);
    return decoded.role;
}

export function isAuthenticated() {
    return !!getToken();
}

export function logout() {
    localStorage.removeItem("token");
}