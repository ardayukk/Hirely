import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Grid, Box, Typography, Select, MenuItem, TextField, Button, Alert } from '@mui/material';
import { axiosInstance, useAuth } from '../context/Authcontext';
import RequirementsEditor from '../components/RequirementsEditor';

export default function Checkout() {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [service, setService] = useState(null);
  const [orderType, setOrderType] = useState('small');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [milestoneCount, setMilestoneCount] = useState(3);
  const [requirements, setRequirements] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchService = async () => {
      try {
        const res = await axiosInstance.get(`/api/services/${serviceId}`);
        setService(res.data);
      } catch (err) {
        console.error('Failed to load service', err);
        setError('Could not load service details');
      }
    };
    if (serviceId) fetchService();
  }, [serviceId]);

  const handlePlaceOrder = async () => {
    if (!user || user.role !== 'client') {
      alert('You must be logged in as a client to place an order');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const normalizedDelivery = orderType === 'small' && deliveryDate ? deliveryDate : null;
      const normalizedMilestones = orderType === 'big' && Number.isFinite(milestoneCount) ? milestoneCount : 3;

      const payload = {
        service_id: parseInt(serviceId),
        total_price: service.hourly_price || 100,
        order_type: orderType,
        delivery_date: normalizedDelivery,
        milestone_count: orderType === 'big' ? normalizedMilestones : null,
        requirements: requirements,
      };

      const res = await axiosInstance.post(`/api/orders?client_id=${user.id}`, payload);
      alert(`Order placed successfully! Order ID: ${res.data.order_id}`);
      navigate('/orders');
    } catch (err) {
      console.error('Failed to place order', err);
      const detail = err.response?.data?.detail;
      const message = typeof detail === 'string' ? detail : detail ? JSON.stringify(detail) : 'Failed to place order';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (!service) {
    return (
      <Container sx={{ mt: 4 }}>
        <Typography>Loading service...</Typography>
      </Container>
    );
  }

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>Checkout</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Box sx={{ p: 3, border: '1px solid #e0e0e0', borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom>{service.title}</Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {service.description}
            </Typography>
            <Typography variant="h6" sx={{ mt: 2 }}>
              ${service.hourly_price ? service.hourly_price.toFixed(2) : 'N/A'}/hr
            </Typography>
          </Box>

          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" gutterBottom>Order Type</Typography>
            <Select value={orderType} onChange={(e) => setOrderType(e.target.value)} fullWidth>
              <MenuItem value="small">Small Order (Single Delivery)</MenuItem>
              <MenuItem value="big">Big Order (Milestones)</MenuItem>
            </Select>
          </Box>

          {orderType === 'small' && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>Delivery Date</Typography>
              <TextField
                type="date"
                fullWidth
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Box>
          )}

          {orderType === 'big' && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>Number of Milestones</Typography>
              <TextField
                type="number"
                fullWidth
                value={milestoneCount}
                onChange={(e) => setMilestoneCount(parseInt(e.target.value))}
                inputProps={{ min: 1, max: 10 }}
              />
            </Box>
          )}

          <Box sx={{ mt: 4 }}>
            <RequirementsEditor value={requirements} onChange={setRequirements} />
          </Box>
        </Grid>

        <Grid item xs={12} md={5}>
          <Box sx={{ p: 3, border: '1px solid #e0e0e0', borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom>Order Summary</Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography>Service Price:</Typography>
              <Typography>${service.hourly_price ? service.hourly_price.toFixed(2) : 'N/A'}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography>Type:</Typography>
              <Typography>{orderType === 'small' ? 'Small' : 'Big (Milestones)'}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', mt: 2, pt: 2, borderTop: '1px solid #e0e0e0' }}>
              <Typography>Total:</Typography>
              <Typography>${service.hourly_price ? service.hourly_price.toFixed(2) : 'N/A'}</Typography>
            </Box>

            <Button
              variant="contained"
              fullWidth
              sx={{ mt: 3 }}
              onClick={handlePlaceOrder}
              disabled={loading}
            >
              {loading ? 'Placing Order...' : 'Place Order'}
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
}
