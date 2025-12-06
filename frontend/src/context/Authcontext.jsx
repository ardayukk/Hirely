import axios from 'axios';
import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

// 2. Create and configure the axios instance
const axiosInstance = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000',
    withCredentials: true, // This is crucial for sending session cookies
});

export { axiosInstance };

// Helper to read cookie by name
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

export function AuthProvider({ children }) {
    // Demo credentials (change if you want different test creds)
    const DEMO_EMAIL = 'demo@local';
    const DEMO_PASSWORD = 'demo123';

    // For demo mode (no backend) provide a default mock user so the app shows the Home page
    // without requiring a login or a running backend. We start with null so login flow is exercised,
    // but the demo credentials below are accepted locally by `login()`.
    const [user, setUser] = useState(null);

    async function login({ email, password }) {
        // Local demo shortcut: accept demo credentials without calling the backend
        if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
            const demoUser = { id: 1, username: 'Demo User', email: DEMO_EMAIL };
            setUser(demoUser);
            return demoUser;
        }
        const response = await axiosInstance.post(
            '/api/auth/login',
            { email, password },
            { headers: { 'Content-Type': 'application/json' } }
        );
        setUser(response.data);
        return response.data;
    }

    async function register({ username, email, password }) {
        const response = await axiosInstance.post('/api/auth/register', {
            username,
            email,
            password,
            role: 'client',
        });

        setUser(response.data);
        return response.data;
    }

    function logout() {
        // You can add a call to a backend logout endpoint here if you create one
        setUser(null);
    }

    return (
        <AuthContext.Provider value={{ user, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);

export default AuthContext;