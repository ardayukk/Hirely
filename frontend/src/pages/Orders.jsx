import React, { useEffect, useState } from 'react';
import { Box, Card, CardContent, Chip, Container, Grid, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { axiosInstance, useAuth } from '../context/Authcontext';

export default function Orders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`/api/orders?user_id=${user.id}`);
      setOrders(res.data || []);
    } catch (err) {
      console.error('Failed to load orders', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#ff9800',
      in_progress: '#2196f3',
      delivered: '#4caf50',
      revision_requested: '#ff5722',
      cancelled: '#9e9e9e',
      completed: '#4caf50',
    };
    return colors[status] || '#9e9e9e';
  };

  if (loading) {
    return (
      <Container sx={{ mt: 4 }}>
        <Typography>Loading orders...</Typography>
      </Container>
    );
  }

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>My Orders</Typography>
      
      {orders.length === 0 && (
        <Typography color="text.secondary">No orders yet.</Typography>
      )}

      <Grid container spacing={3} sx={{ mt: 2 }}>
        {orders.map((order) => (
          <Grid item xs={12} md={6} key={order.order_id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Order #{order.order_id}</Typography>
                  <Chip
                    label={order.status}
                    sx={{
                      backgroundColor: getStatusColor(order.status),
                      color: '#fff',
                      fontWeight: 'bold',
                    }}
                  />
                </Box>
                
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Service ID: {order.service_id}
                </Typography>
                
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Order Date: {new Date(order.order_date).toLocaleDateString()}
                </Typography>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    ${order.total_price.toFixed(2)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {order.revision_count} revision{order.revision_count !== 1 ? 's' : ''}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                  <Button fullWidth variant="outlined" onClick={() => navigate(`/orders/${order.order_id}`)}>
                    View
                  </Button>
                  <Button fullWidth variant="contained" onClick={() => navigate(`/orders/${order.order_id}#chat`)}>
                    Message
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
