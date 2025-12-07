import React, { useEffect, useState } from 'react';
import { Container, Typography, Box, Paper, Divider, Button, Chip, Grid, Alert } from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { axiosInstance, useAuth } from '../context/Authcontext';

export default function OrderDetail() {
  const { orderId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`/api/orders/${orderId}`);
      setOrder(res.data);
    } catch (err) {
      console.error('Failed to load order', err);
      setError(err.response?.data?.detail || 'Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    try {
      await axiosInstance.patch(`/api/orders/${orderId}/accept?freelancer_id=${user.id}`);
      await fetchOrder();
      alert('Order accepted');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to accept order');
    }
  };

  const handleDeliver = async () => {
    try {
      await axiosInstance.patch(`/api/orders/${orderId}/deliver?freelancer_id=${user.id}`);
      await fetchOrder();
      alert('Order marked as delivered');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to deliver order');
    }
  };

  const handleComplete = async () => {
    try {
      await axiosInstance.patch(`/api/orders/${orderId}/complete?client_id=${user.id}`);
      await fetchOrder();
      alert('Order completed');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to complete order');
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    try {
      await axiosInstance.patch(`/api/orders/${orderId}/cancel?client_id=${user.id}`);
      await fetchOrder();
      alert('Order cancelled');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to cancel order');
    }
  };

  const handleRequestRevision = async () => {
    const text = prompt('Describe what needs to be revised:');
    if (!text) return;
    try {
      await axiosInstance.post(`/api/orders/${orderId}/revisions?client_id=${user.id}`, {
        revision_text: text,
      });
      await fetchOrder();
      alert('Revision requested');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to request revision');
    }
  };

  const handleLeaveReview = async () => {
    const ratingStr = prompt('Rating (1-5):');
    if (!ratingStr) return;
    const rating = parseInt(ratingStr);
    if (rating < 1 || rating > 5) {
      alert('Rating must be between 1 and 5');
      return;
    }
    const comment = prompt('Comment (optional):');
    try {
      await axiosInstance.post(`/api/orders/${orderId}/review?client_id=${user.id}`, {
        rating,
        comment,
      });
      await fetchOrder();
      alert('Review submitted');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to submit review');
    }
  };

  if (loading) {
    return (
      <Container sx={{ mt: 4 }}>
        <Typography>Loading order details...</Typography>
      </Container>
    );
  }

  if (error || !order) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="error">{error || 'Order not found'}</Alert>
        <Button sx={{ mt: 2 }} onClick={() => navigate('/orders')}>Back to Orders</Button>
      </Container>
    );
  }

  const isClient = user?.id === order.client_id;
  const isFreelancer = user?.id === order.freelancer_id;

  return (
    <Container sx={{ mt: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Order #{order.order_id}</Typography>
        <Chip
          label={order.status}
          color={order.status === 'completed' ? 'success' : order.status === 'cancelled' ? 'error' : 'primary'}
        />
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Order Details</Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">Service</Typography>
              <Typography variant="body1">{order.service_title || `Service #${order.service_id}`}</Typography>
              {order.service_category && (
                <Chip label={order.service_category} size="small" sx={{ mt: 1 }} />
              )}
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">Order Date</Typography>
              <Typography variant="body1">{new Date(order.order_date).toLocaleString()}</Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">Total Price</Typography>
              <Typography variant="h6">${order.total_price.toFixed(2)}</Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">Revisions</Typography>
              <Typography variant="body1">{order.revision_count}</Typography>
            </Box>

            {order.is_big_order && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">Milestones</Typography>
                <Typography variant="body1">
                  Phase {order.current_phase} of {order.milestone_count}
                </Typography>
              </Box>
            )}
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Participants</Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">Client</Typography>
              <Typography variant="body1">{order.client_name || `Client #${order.client_id}`}</Typography>
            </Box>

            <Box>
              <Typography variant="body2" color="text.secondary">Freelancer</Typography>
              <Typography variant="body1">{order.freelancer_name || `Freelancer #${order.freelancer_id}`}</Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>Actions</Typography>
            <Divider sx={{ mb: 2 }} />

            {isFreelancer && order.status === 'pending' && (
              <Button fullWidth variant="contained" sx={{ mb: 1 }} onClick={handleAccept}>
                Accept Order
              </Button>
            )}

            {isFreelancer && order.status === 'in_progress' && (
              <Button fullWidth variant="contained" sx={{ mb: 1 }} onClick={handleDeliver}>
                Mark as Delivered
              </Button>
            )}

            {isClient && order.status === 'delivered' && (
              <>
                <Button fullWidth variant="contained" color="success" sx={{ mb: 1 }} onClick={handleComplete}>
                  Accept Delivery
                </Button>
                <Button fullWidth variant="outlined" sx={{ mb: 1 }} onClick={handleRequestRevision}>
                  Request Revision
                </Button>
              </>
            )}

            {isClient && order.status === 'completed' && !order.review_given && (
              <Button fullWidth variant="contained" sx={{ mb: 1 }} onClick={handleLeaveReview}>
                Leave Review
              </Button>
            )}

            {isClient && order.status === 'pending' && (
              <Button fullWidth variant="outlined" color="error" sx={{ mb: 1 }} onClick={handleCancel}>
                Cancel Order
              </Button>
            )}

            <Button fullWidth variant="outlined" onClick={() => navigate('/orders')}>
              Back to Orders
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}
