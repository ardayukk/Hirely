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
    const [user, setUser] = useState(null);

    async function login({ email, password }) {
        try {
            const response = await axiosInstance.post(
                '/api/auth/login',
                { email, password },
                { headers: { 'Content-Type': 'application/json' } }
            );
            setUser(response.data);
            return response.data;
        } catch (err) {
            // Extract error detail from backend response
            const detail = err.response?.data?.detail || 'Login failed';
            throw new Error(detail);
        }
    }

    async function register({ username, email, password }) {
        try {
            const response = await axiosInstance.post('/api/auth/register', {
                username,
                email,
                password,
                role: 'client',
            });

            setUser(response.data);
            return response.data;
        } catch (err) {
            // Extract error detail from backend response
            const detail = err.response?.data?.detail || 'Registration failed';
            throw new Error(detail);
        }
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