import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  Typography,
  Button,
  LinearProgress,
  Tooltip,
  IconButton,
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import { useNavigate } from 'react-router-dom';
import { axiosInstance, useAuth } from '../context/Authcontext';

// Clean Orders page with status colors and optional progress/countdown
export default function Orders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [orderDetails, setOrderDetails] = useState({});
  const [loading, setLoading] = useState(false);
  const [wallet, setWallet] = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    fetchOrders();
    fetchWallet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(`/api/orders?user_id=${user.id}`);
      const list = res.data || [];
      setOrders(list);

      // Fetch details for each order in parallel (for progress/countdown)
      const details = {};
      await Promise.all(
        list.map(async (o) => {
          try {
            const d = await axiosInstance.get(`/api/orders/${o.order_id}`);
            details[o.order_id] = d.data;
          } catch (e) {
            // Ignore individual failures
          }
        })
      );
      setOrderDetails(details);
    } catch (err) {
      console.error('Failed to load orders', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWallet = async () => {
    if (!user?.id) return;
    try {
      const res = await axiosInstance.get(`/api/users/${user.id}`);
      if (res?.data?.wallet_balance !== undefined) {
        setWallet(res.data.wallet_balance);
      }
    } catch (err) {
      // non-blocking
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h4" gutterBottom sx={{ mb: 0 }}>
          My Orders
        </Typography>
        {user?.role === 'freelancer' && wallet !== null && (
          <Chip
            label={`Wallet: $${Number(wallet).toFixed(2)}`}
            color="success"
            sx={{ fontWeight: 'bold' }}
          />
        )}
      </Box>

      {orders.length === 0 && <Typography color="text.secondary">No orders yet.</Typography>}

      <Grid container spacing={3} sx={{ mt: 2 }}>
        {orders.map((order) => {
          const totalDisplay =
            typeof order.total_price === 'number'
              ? order.total_price.toFixed(2)
              : order.total_price;

          return (
            <Grid item xs={12} md={6} key={order.order_id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">Order #{order.order_id}</Typography>
                    <Chip
                      label={order.status}
                      sx={{ backgroundColor: getStatusColor(order.status), color: '#fff', fontWeight: 'bold' }}
                    />
                  </Box>

                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Service ID: {order.service_id}
                  </Typography>

                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Order Date: {order.order_date ? new Date(order.order_date).toLocaleDateString() : ''}
                  </Typography>

                  {/* Progress / Countdown area when details are available */}
                  {orderDetails[order.order_id] && (
                    <Box sx={{ mt: 2 }}>
                      {orderDetails[order.order_id].is_big_order ? (
                        <>
                          <Typography variant="caption">Milestone progress</Typography>
                          <LinearProgress
                            variant="determinate"
                            value={
                              (orderDetails[order.order_id].current_phase /
                                Math.max(1, orderDetails[order.order_id].milestone_count)) * 100
                            }
                            sx={{ height: 10, borderRadius: 2, mt: 1 }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            Phase {orderDetails[order.order_id].current_phase} / {orderDetails[order.order_id].milestone_count}
                          </Typography>
                        </>
                      ) : (
                        <>
                          <Typography variant="caption">Estimated delivery</Typography>
                          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {(() => {
                              const est = order.order_date ? new Date(order.order_date) : new Date();
                              est.setDate(est.getDate() + 7);
                              const diff = Math.max(0, Math.ceil((est - new Date()) / (1000 * 60 * 60 * 24)));
                              return `${est.toLocaleDateString()} (${diff} day${diff !== 1 ? 's' : ''} left)`;
                            })()}
                            <Tooltip title="Estimated delivery is based on order creation + 7 days">
                              <IconButton size="small">
                                <InfoIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Typography>
                        </>
                      )}
                    </Box>
                  )}

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      ${totalDisplay}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {order.revision_count ?? 0} revision{(order.revision_count ?? 0) !== 1 ? 's' : ''}
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
          );
        })}
      </Grid>
    </Container>
  );
}