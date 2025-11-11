import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { AppBar, Button, Container, IconButton, Toolbar } from '@mui/material';
import { useContext } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/Authcontext'; // ✅ import your Auth hook (fixed relative path & filename case)
import Home from '../pages/Home';
import Login from '../pages/Login';
import Profile from '../pages/Profile';
import Register from '../pages/Register';
import Seller from '../pages/Seller';
import { ThemeModeContext } from './main';

function AppContent() {
    const location = useLocation();
    const navigate = useNavigate(); // ✅ useNavigate hook
    const { user, logout } = useAuth(); // ✅ get logout from context
    const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

    const handleLogout = () => {
        logout(); // calls the logout from AuthContext
        navigate('/login', { replace: true }); // redirect to login
    };

    function ThemeToggle() {
        const { mode, toggleMode } = useContext(ThemeModeContext);
        return (
            <IconButton onClick={toggleMode} color="inherit" sx={{ ml: 1 }}>
                {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
        );
    }

    return (
        <>
            {!isAuthPage && user && ( // ✅ only show AppBar if user is logged in
                <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                    <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Button component={Link} to="/home" variant="text">Artifact Comparator</Button>
                        <Button component={Link} to="/seller" variant="text">Seller</Button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Button onClick={handleLogout}>Logout</Button>
                            <Button component={Link} to="/seller">Seller</Button>
                            <Button component={Link} to="/profile">Profile</Button>
                            <ThemeToggle />
                        </div>
                    </Toolbar>
                </AppBar>
            )}

            <Routes>
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', width: '100%' }}><Login /></div>} />
                <Route path="/register" element={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', width: '100%' }}><Register /></div>} />
                <Route path="/seller" element={<Seller />} />

                {/* Protected routes */}
                <Route path="/home" element={user ? <Container sx={{ mt: 4 }}><Home /></Container> : <Navigate to="/login" replace />} />
                <Route path="/profile" element={user ? <Container sx={{ mt: 4 }}><Profile /></Container> : <Navigate to="/login" replace />} />

                {/* Fallback */}
                <Route path="*" element={<Navigate to={user ? "/home" : "/login"} replace />} />
            </Routes>
        </>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <AppContent />
        </BrowserRouter>
    );
}
