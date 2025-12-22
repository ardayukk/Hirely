import { Alert, Box, Button, Container, Grid, MenuItem, Select, Snackbar, TextField, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import RequirementsEditor from '../components/RequirementsEditor';
import { axiosInstance, useAuth } from '../context/Authcontext';

export default function Checkout() {
    const { serviceId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [service, setService] = useState(null);
    const [orderType, setOrderType] = useState('small');
    const [deliveryDate, setDeliveryDate] = useState('');
    const [milestoneCount, setMilestoneCount] = useState(3);
    const [requiredHours, setRequiredHours] = useState(1);
    const [requirements, setRequirements] = useState({});
    const [selectedTier, setSelectedTier] = useState('Standard');
    const [selectedAddons, setSelectedAddons] = useState([]);
    const [totalPrice, setTotalPrice] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');

    useEffect(() => {
        const fetchService = async () => {
            try {
                const res = await axiosInstance.get(`/api/services/${serviceId}`);
                setService(res.data);
                if (res.data?.package_tier) setSelectedTier(res.data.package_tier);
            } catch (err) {
                console.error('Failed to load service', err);
                setError('Could not load service details');
            }
        };
        if (serviceId) fetchService();
    }, [serviceId]);

    useEffect(() => {
        if (!service) return;
        const base = service.hourly_price || 0;
        let addonsTotal = 0;
        if (service.addons && service.addons.length && selectedAddons.length) {
            addonsTotal = service.addons
                .filter(a => selectedAddons.includes(a.service_id))
                .reduce((s, a) => s + (a.hourly_price || 0), 0);
        }
        setTotalPrice((base || 0) + addonsTotal);
    }, [service, selectedAddons]);

    const handlePlaceOrder = async () => {
        if (!user || user.role !== 'client') {
            alert('You must be logged in as a client to place an order');
            return;
        }

        try {
            setLoading(true);
            setError('');

            const normalizedDelivery = orderType === 'small' && deliveryDate ? deliveryDate : null;
            const normalizedMilestones = orderType === 'big' && Number.isFinite(Number(milestoneCount)) ? Math.max(2, Number(milestoneCount)) : 2;

            // validate requiredHours and milestones
            if (requiredHours === '' || Number.isNaN(Number(requiredHours)) || Number(requiredHours) < 1) {
                setError('Please enter a valid number of required hours (>= 1).');
                setLoading(false);
                return;
            }
            if (orderType === 'big' && (milestoneCount === '' || Number.isNaN(Number(milestoneCount)) || Number(milestoneCount) < 2)) {
                setError('Please enter a valid number of milestones (>= 2) for big orders.');
                setLoading(false);
                return;
            }

            let totalPrice = (service.hourly_price || 0) * Number(requiredHours);
            if (orderType === 'big' && normalizedMilestones > 1) {
                totalPrice *= normalizedMilestones;
            }

            // compute hourly total including selected add-ons
            const baseHourly = service.hourly_price || 0;
            let addonsHourly = 0;
            if (service.addons && service.addons.length && selectedAddons.length) {
                addonsHourly = service.addons
                    .filter(a => selectedAddons.includes(a.service_id))
                    .reduce((s, a) => s + (a.hourly_price || 0), 0);
            }
            const hourlyTotal = baseHourly + addonsHourly;
            const computedTotalPrice = hourlyTotal * Number(requiredHours) * (orderType === 'big' ? normalizedMilestones : 1);

            const payload = {
                service_id: parseInt(serviceId),
                total_price: computedTotalPrice,
                required_hours: Number(requiredHours),
                order_type: orderType,
                delivery_date: normalizedDelivery,
                milestone_count: orderType === 'big' ? normalizedMilestones : null,
                requirements: { ...requirements, selected_package_tier: selectedTier },
                addon_service_ids: selectedAddons,
            };

            const res = await axiosInstance.post(`/api/orders?client_id=${user.id}`, payload);

            // Track order conversion
            await axiosInstance.post('/api/analytics/events', {
                service_id: parseInt(serviceId),
                event_type: 'ORDER_CONVERSION',
                metadata: {
                    order_id: res.data.order_id,
                    amount: computedTotalPrice
                }
            }).catch(err => console.error("Failed to track conversion", err));

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

    // display total: if big order, multiply required hours by milestone count
    const displayNormalizedMilestones = orderType === 'big' && Number.isFinite(Number(milestoneCount)) ? Number(milestoneCount) : 1;
    const displayHours = requiredHours === '' ? 0 : Number(requiredHours);
    // compute display total using base hourly + selected add-ons
    const addonsHourlyForDisplay = service && service.addons && selectedAddons.length
        ? service.addons.filter(a => selectedAddons.includes(a.service_id)).reduce((s, a) => s + (a.hourly_price || 0), 0)
        : 0;
    const displayTotalPrice = ((service.hourly_price || 0) + addonsHourlyForDisplay) * displayHours * (orderType === 'big' ? displayNormalizedMilestones : 1);

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

                    <Box sx={{ mt: 3 }}>
                        <Typography variant="subtitle1" gutterBottom>Package Tier</Typography>
                        <Select value={selectedTier} onChange={(e) => setSelectedTier(e.target.value)} fullWidth>
                            <MenuItem value="Basic">Basic</MenuItem>
                            <MenuItem value="Standard">Standard</MenuItem>
                            <MenuItem value="Premium">Premium</MenuItem>
                        </Select>
                    </Box>

                    <Box sx={{ mt: 3 }}>
                        <Typography variant="subtitle1" gutterBottom>Required Hours</Typography>
                        <TextField
                            type="number"
                            fullWidth
                            value={requiredHours}
                            onChange={(e) => {
                                const v = e.target.value;
                                if (v === '') {
                                    setRequiredHours('');
                                } else {
                                    const n = parseInt(v, 10);
                                    setRequiredHours(Number.isFinite(n) ? n : '');
                                }
                            }}
                            inputProps={{ min: 1, step: 1 }}
                            helperText="Estimate how many hours you need for this service"
                        />
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
                                onChange={(e) => {
                                    const v = e.target.value;
                                    if (v === '') {
                                        setMilestoneCount('');
                                    } else {
                                        const n = parseInt(v, 10);
                                        setMilestoneCount(Number.isFinite(n) ? n : '');
                                    }
                                }}
                                onBlur={() => {
                                    const v = milestoneCount;
                                    const n = Number(v);
                                    if (orderType === 'big') {
                                        if (v === '' || Number.isNaN(n) || n < 2) {
                                            // auto-correct to minimum and notify user
                                            setMilestoneCount(2);
                                            setSnackbarMessage('Minimum 2 milestones required — set to 2');
                                            setSnackbarOpen(true);
                                        }
                                    }
                                }}
                                inputProps={{ min: 2, max: 10 }}
                                helperText="Minimum 2 milestones for big orders"
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
                            <Typography>Hourly Rate:</Typography>
                            <Typography>${service.hourly_price ? service.hourly_price.toFixed(2) : '0.00'}/hr</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography>Required Hours:</Typography>
                            <Typography>{requiredHours}h</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography>Type:</Typography>
                            <Typography>{orderType === 'small' ? 'Small' : 'Big (Milestones)'}</Typography>
                        </Box>

                        {service.addons && service.addons.length > 0 && (
                            <Box sx={{ mt: 2, mb: 2 }}>
                                <Typography variant="subtitle2">Add-ons</Typography>
                                {service.addons.map((a) => (
                                    <Box key={a.service_id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                                        <Box>
                                            <Typography sx={{ fontWeight: 'bold' }}>{a.title}</Typography>
                                            <Typography variant="caption" color="text.secondary">{a.category} — {a.description || ''}</Typography>
                                        </Box>
                                        <Box>
                                            <label style={{ marginRight: 8 }}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedAddons.includes(a.service_id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) setSelectedAddons(prev => [...prev, a.service_id]);
                                                        else setSelectedAddons(prev => prev.filter(id => id !== a.service_id));
                                                    }}
                                                />
                                            </label>
                                            <Typography>{a.hourly_price ? `$${a.hourly_price.toFixed(2)}` : 'Free'}</Typography>
                                        </Box>
                                    </Box>
                                ))}
                            </Box>
                        )}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', mt: 2, pt: 2, borderTop: '1px solid #e0e0e0' }}>
                            <Typography>Total:</Typography>
                            <Typography>${displayTotalPrice.toFixed(2)}</Typography>
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
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={null}
                onClose={() => setSnackbarOpen(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={() => setSnackbarOpen(false)} severity="warning" sx={{ width: '100%' }}>
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </Container>
    );
}
