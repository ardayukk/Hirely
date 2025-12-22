import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Chip,
  Container,
  Grid,
  Typography,
  Button,
  Stack,
  useTheme,
  CircularProgress,
  Fade,
  Paper,
  Divider,
  Avatar,
} from '@mui/material';
import {
  ShoppingCart as OrderIcon,
  AccessTime as PendingIcon,
  CheckCircle as CompleteIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { axiosInstance, useAuth } from '../context/Authcontext';

export default function Orders() {
  const { user } = useAuth();
  const theme = useTheme();
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
      pending: 'warning',
      in_progress: 'info',
      delivered: 'success',
      revision_requested: 'error',
      cancelled: 'default',
      completed: 'success',
    };
    return colors[status] || 'default';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CompleteIcon fontSize="small" />;
      case 'in_progress':
        return <PendingIcon fontSize="small" />;
      case 'pending':
        return <PendingIcon fontSize="small" />;
      case 'revision_requested':
        return <ErrorIcon fontSize="small" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${theme.palette.background.default} 0%, ${theme.palette.mode === 'dark' ? '#1a1a2e' : '#f5f5f5'} 100%)`,
        py: 4,
      }}
    >
      <Container maxWidth="lg">
        <Stack spacing={4}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography
              variant="h3"
              sx={{
                fontWeight: '800',
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 1,
              }}
            >
              My Orders
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Track and manage all your orders in one place
            </Typography>
          </Box>

          {orders.length === 0 && (
            <Paper
              sx={{
                p: 6,
                textAlign: 'center',
                borderRadius: 2,
                backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[900] : theme.palette.grey[50],
              }}
            >
              <OrderIcon sx={{ fontSize: 64, color: theme.palette.action.disabled, mb: 2 }} />
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                No orders yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Start by browsing services or creating a new order.
              </Typography>
              <Button
                variant="contained"
                onClick={() => navigate('/services')}
                sx={{ textTransform: 'none' }}
              >
                Browse Services
              </Button>
            </Paper>
          )}

          {orders.length > 0 && (
            <Grid container spacing={3}>
              {orders.map((order, idx) => (
                <Grid item xs={12} md={6} key={order.order_id}>
                  <Fade in={true} timeout={300 + idx * 50}>
                    <Card
                      sx={{
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: 2,
                        boxShadow: theme.shadows[8],
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': {
                          transform: 'translateY(-8px)',
                          boxShadow: theme.shadows[12],
                      },
                    }}
                  >
                    <CardContent sx={{ flex: 1 }}>
                      <Stack spacing={2}>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                          <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            Order #{order.order_id}
                          </Typography>
                          <Chip
                            icon={getStatusIcon(order.status)}
                            label={order.status?.replace('_', ' ').toUpperCase() || 'PENDING'}
                            color={getStatusColor(order.status)}
                            sx={{ fontWeight: 600 }}
                          />
                        </Stack>

                        <Divider />

                        <div>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            Service
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {order.service_title || `Service #${order.service_id}`}
                          </Typography>
                        </div>

                        <Stack direction="row" spacing={2}>
                          <div>
                            <Typography variant="caption" color="text.secondary">
                              Order Date
                            </Typography>
                            <Typography variant="body2">
                              {new Date(order.order_date).toLocaleDateString()}
                            </Typography>
                          </div>
                          {order.delivery_date && (
                            <div>
                              <Typography variant="caption" color="text.secondary">
                                Due Date
                              </Typography>
                              <Typography variant="body2">
                                {new Date(order.delivery_date).toLocaleDateString()}
                              </Typography>
                            </div>
                          )}
                        </Stack>

                        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'space-between', pt: 1 }}>
                          <div>
                            <Typography variant="caption" color="text.secondary">
                              Price
                            </Typography>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
                              ${parseFloat(order.total_price || 0).toFixed(2)}
                            </Typography>
                          </div>
                          {order.revision_count > 0 && (
                            <Chip
                              label={`${order.revision_count} revision${order.revision_count !== 1 ? 's' : ''}`}
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Stack>
                      </Stack>
                    </CardContent>

                    <CardActions sx={{ gap: 1, p: 2 }}>
                      <Button
                        fullWidth
                        variant="outlined"
                        onClick={() => navigate(`/orders/${order.order_id}`)}
                        sx={{ textTransform: 'none' }}
                      >
                        View Details
                      </Button>
                      <Button
                        fullWidth
                        variant="contained"
                        onClick={() => navigate(`/orders/${order.order_id}#chat`)}
                        sx={{ textTransform: 'none' }}
                      >
                        Message
                      </Button>
                    </CardActions>
                    </Card>
                  </Fade>
                </Grid>
              ))}
            </Grid>
          )}
        </Stack>
      </Container>
    </Box>
  );
}
