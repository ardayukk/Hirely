import { Alert, Box, CircularProgress, Container, Grid, Tab, Tabs, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import OrderCard from '../components/OrderCard';
import { useAuth } from '../context/Authcontext';
import { api } from '../utils/api';

export default function FreelancerWorkspace() {
    const { user } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('active'); // active, completed, all

    useEffect(() => {
        if (user?.id) {
            fetchOrders();
        }
    }, [user]);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            // Fetch all orders for the user
            const data = await api.get(`/api/orders?user_id=${user.id}`);
            setOrders(data);
        } catch (err) {
            console.error("Failed to fetch orders", err);
            setError("Failed to load orders. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const filteredOrders = orders.filter(order => {
        if (filter === 'active') {
            return ['pending', 'accepted', 'in_progress', 'revision_requested', 'delivered'].includes(order.status);
        }
        if (filter === 'completed') {
            return ['completed', 'cancelled'].includes(order.status);
        }
        return true;
    });

    const handleTabChange = (event, newValue) => {
        setFilter(newValue);
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    if (error) return <Container sx={{ mt: 4 }}><Alert severity="error">{error}</Alert></Container>;

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" gutterBottom fontWeight="bold">
                Freelancer Workspace
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Manage your active orders and deliveries.
            </Typography>

            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs value={filter} onChange={handleTabChange} aria-label="order filters">
                    <Tab label="Active Orders" value="active" />
                    <Tab label="Completed" value="completed" />
                    <Tab label="All Orders" value="all" />
                </Tabs>
            </Box>

            {filteredOrders.length === 0 ? (
                <Alert severity="info">No orders found in this category.</Alert>
            ) : (
                <Grid container spacing={3}>
                    {filteredOrders.map(order => (
                        <Grid item xs={12} key={order.order_id}>
                            <OrderCard order={order} />
                        </Grid>
                    ))}
                </Grid>
            )}
        </Container>
    );
}
