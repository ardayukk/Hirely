import axios from 'axios'; // 1. Import axios
import { createContext, useContext, useState } from 'react';
import sha256Hex from '../helper/hash';

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

async function ensureCsrf() {
    // Call backend endpoint that sets the CSRF cookie
    try {
        await axiosInstance.get('/auth/csrf/');
    } catch (e) {
        // ignore errors here; cookie may have been set or CORS blocked
    }
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);

    async function login({ email, password }) {
        try {
            await ensureCsrf();
            const csrftoken = getCookie('csrftoken');
            // Hash password client-side before sending
            const hashed = await sha256Hex(password);
            const response = await axiosInstance.post(
                '/auth/api/signin/',
                { email, password: hashed },
                { headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrftoken } }
            );

            if (response.data?.success) {
                setUser(response.data.user || null);
                return response.data.user;
            }
            throw new Error(response.data?.error || 'Login failed');
        } catch (err) {
            const errMsg = err.response?.data?.error || err.message || 'Login failed';
            throw new Error(errMsg);
        }
    }

    async function register({ username, email, password }) {
        try {
            await ensureCsrf();
            const csrftoken = getCookie('csrftoken');
            // Hash password client-side before sending
            const hashed = await sha256Hex(password);
            const response = await axiosInstance.post('/auth/api/signup/', {
                username,
                email,
                password: hashed,
            }, { headers: { 'X-CSRFToken': csrftoken } });

            // A successful signup returns the user data directly
            setUser(response.data.user || null);
            return response.data;
        } catch (err) {
            // Handle DRF validation errors or other issues
            const errorData = err.response?.data;
            let errMsg = 'Registration failed. Please try again.';

            if (typeof errorData === 'object' && errorData !== null) {
                // This will format DRF's validation error messages
                errMsg = Object.values(errorData).flat().join(' ');
            } else if (typeof errorData === 'string') {
                errMsg = errorData;
            }

            throw new Error(errMsg);
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