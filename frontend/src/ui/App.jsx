import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { AppBar, Button, Container, IconButton, Toolbar } from '@mui/material';
import { useContext } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/Authcontext'; // ✅ import your Auth hook (fixed relative path & filename case)
import { MockApiProvider } from '../context/MockApiProvider';
import Checkout from '../pages/Checkout';
import ClientWorkspace from '../pages/Client';
import Home from '../pages/Home';
import Inbox from '../pages/Inbox';
import Login from '../pages/Login';
import Logout from '../pages/Logout';
import OrderDetail from '../pages/OrderDetail';
import Orders from '../pages/Orders';
import Profile from '../pages/Profile';
import Register from '../pages/Register';
import Seller from '../pages/Seller';
import Admin from '../pages/AdminDisputes';
import Workspace from '../pages/Workspace';
import Services from '../pages/Services';
import ServiceDetail from '../pages/ServiceDetail';
import CreateService from '../pages/CreateService';
import MyServices from '../pages/MyServices';
import { ThemeModeContext } from './main';

function AppContent() {
    const location = useLocation();
    const navigate = useNavigate(); // ✅ useNavigate hook
    const { user, logout } = useAuth(); // ✅ get logout from context
    const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

    const requireAuth = (element) => (user ? element : <Navigate to="/login" replace />);

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
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Button component={Link} to="/home#freelancer" variant="text">Freelancer</Button>
                            <Button component={Link} to="/home#user" variant="text">User</Button>
                            <Button component={Link} to="/home#admin" variant="text">Admin</Button>
                            <Button component={Link} to="/services" variant="text">Services</Button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Button component={Link} to="/home">Home</Button>
                            <Button onClick={handleLogout}>Logout</Button>
                            <Button component={Link} to="/profile">Profile</Button>
                            <ThemeToggle />
                        </div>
                    </Toolbar>
                </AppBar>
            )}

            <MockApiProvider>
            <Routes>
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', width: '100%' }}><Login /></div>} />
                <Route path="/register" element={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', width: '100%' }}><Register /></div>} />

                <Route path="/home" element={requireAuth(<Home />)} />
                <Route path="/profile" element={requireAuth(<Container sx={{ mt: 4 }}><Profile /></Container>)} />
                <Route path="/seller" element={requireAuth(<Seller />)} />
                <Route path="/client" element={requireAuth(<ClientWorkspace />)} />
                <Route path="/admin" element={requireAuth(<Admin />)} />
                <Route path="/workspace" element={requireAuth(<Workspace />)} />
                <Route path="/checkout/:serviceId" element={requireAuth(<Checkout />)} />
                <Route path="/orders" element={requireAuth(<Orders />)} />
                <Route path="/orders/:orderId" element={requireAuth(<OrderDetail />)} />
                <Route path="/inbox" element={requireAuth(<Inbox />)} />
                <Route path="/inbox/:conversationId" element={requireAuth(<OrderDetail />)} />
                <Route path="/services" element={requireAuth(<Services />)} />
                <Route path="/services/:serviceId" element={requireAuth(<ServiceDetail />)} />
                <Route path="/create-service" element={requireAuth(<CreateService />)} />
                <Route path="/myServices" element={requireAuth(<MyServices />)} />
                <Route path="/logout" element={<Logout />} />

                <Route path="*" element={<Navigate to={user ? "/home" : "/login"} replace />} />
            </Routes>
            </MockApiProvider>
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
