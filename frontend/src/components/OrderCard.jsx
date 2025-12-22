import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { Box, Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function OrderCard({ order }) {
    const navigate = useNavigate();
    const [timeLeft, setTimeLeft] = useState('');
    const [isOverdue, setIsOverdue] = useState(false);

    useEffect(() => {
        if (!order.delivery_date) return;

        const calculateTimeLeft = () => {
            const now = new Date();
            const due = new Date(order.delivery_date);
            const diff = due - now;

            if (diff < 0) {
                setIsOverdue(true);
                setTimeLeft('Overdue');
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

            if (days > 0) {
                setTimeLeft(`${days}d ${hours}h left`);
            } else {
                setTimeLeft(`${hours}h left`);
            }
        };

        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 60000); // Update every minute
        return () => clearInterval(timer);
    }, [order.delivery_date]);

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'warning';
            case 'in_progress': return 'info';
            case 'delivered': return 'success';
            case 'completed': return 'success';
            case 'revision_requested': return 'error';
            case 'cancelled': return 'default';
            default: return 'default';
        }
    };

    const handleViewOrder = () => {
        navigate(`/orders/${order.order_id}`);
    };

    return (
        <Card variant="outlined" sx={{ '&:hover': { boxShadow: 3 }, transition: 'box-shadow 0.2s' }}>
            <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" component="div" gutterBottom>
                            {order.service_title || `Order #${order.order_id}`}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            Client: {order.client_name || 'Unknown Client'}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                            <Chip
                                label={order.status ? order.status.replace('_', ' ').toUpperCase() : 'UNKNOWN'}
                                color={getStatusColor(order.status)}
                                size="small"
                            />
                            <Typography variant="body2" fontWeight="bold">
                                ${order.total_price}
                            </Typography>
                        </Stack>
                    </Box>

                    <Box sx={{ textAlign: 'right', minWidth: 120 }}>
                        {order.delivery_date && (
                            <Box sx={{ mb: 1, color: isOverdue ? 'error.main' : 'text.secondary', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                                <AccessTimeIcon fontSize="small" />
                                <Typography variant="caption" fontWeight="bold">
                                    {timeLeft}
                                </Typography>
                            </Box>
                        )}
                        <Button variant="contained" size="small" onClick={handleViewOrder}>
                            Manage Order
                        </Button>
                    </Box>
                </Stack>
            </CardContent>
        </Card>
    );
}
