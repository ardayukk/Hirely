import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Container, Grid, Box, Typography, Select, MenuItem, TextField, Button, Alert, Checkbox, FormControlLabel, Divider } from '@mui/material';
import { axiosInstance, useAuth } from '../context/Authcontext';

export default function Checkout() {
  const { serviceId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [service, setService] = useState(null);
  const [orderType, setOrderType] = useState('small');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [milestoneCount, setMilestoneCount] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedAddons, setSelectedAddons] = useState(location.state?.selectedAddons || []);

  useEffect(() => {
    const fetchService = async () => {
      try {
        const res = await axiosInstance.get(`/api/services/${serviceId}`);
        setService(res.data);
        // Keep only addons that still exist
        if (res.data?.addons?.length) {
          setSelectedAddons((prev) => prev.filter((id) => res.data.addons.some((a) => a.service_id === id)));
        } else {
          setSelectedAddons([]);
        }
      } catch (err) {
        console.error('Failed to load service', err);
        setError('Could not load service details');
      }
    };
    if (serviceId) fetchService();
  }, [serviceId]);

  const toggleAddon = (id) => {
    setSelectedAddons((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const addonsTotal = service?.addons
    ? service.addons
        .filter((a) => selectedAddons.includes(a.service_id))
        .reduce((sum, a) => sum + (a.hourly_price || 0), 0)
    : 0;
  const basePrice = service?.hourly_price || 0;
  const totalPrice = basePrice + addonsTotal;

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
        total_price: totalPrice || 0,
        order_type: orderType,
        delivery_date: normalizedDelivery,
        milestone_count: orderType === 'big' ? normalizedMilestones : null,
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

            {service.addons && service.addons.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="subtitle1" gutterBottom>Add-ons</Typography>
                {service.addons.map((addon) => (
                  <FormControlLabel
                    key={addon.service_id}
                    control={
                      <Checkbox
                        checked={selectedAddons.includes(addon.service_id)}
                        onChange={() => toggleAddon(addon.service_id)}
                      />
                    }
                    label={`${addon.title} — $${addon.hourly_price ? addon.hourly_price.toFixed(2) : '0.00'}/hr`}
                  />
                ))}
              </Box>
            )}
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
        </Grid>

        <Grid item xs={12} md={5}>
          <Box sx={{ p: 3, border: '1px solid #e0e0e0', borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom>Order Summary</Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography>Service Price:</Typography>
              <Typography>${service.hourly_price ? service.hourly_price.toFixed(2) : '0.00'}</Typography>
            </Box>
            {service.addons && service.addons.length > 0 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography>Add-ons:</Typography>
                <Typography>${addonsTotal.toFixed(2)}</Typography>
              </Box>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography>Type:</Typography>
              <Typography>{orderType === 'small' ? 'Small' : 'Big (Milestones)'}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', mt: 2, pt: 2, borderTop: '1px solid #e0e0e0' }}>
              <Typography>Total:</Typography>
              <Typography>${totalPrice.toFixed(2)}</Typography>
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
