import { Alert, Box, Button, Chip, CircularProgress, Container, Divider, Grid, Paper, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import ChatComposer from '../components/ChatComposer';
import { axiosInstance, useAuth } from '../context/Authcontext';

export default function OrderDetail() {
    const { orderId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [chatOpen, setChatOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [sending, setSending] = useState(false);
    const [messageError, setMessageError] = useState('');
    const [disputeLoading, setDisputeLoading] = useState(false);
    const [disputeError, setDisputeError] = useState('');
    const [addonDetails, setAddonDetails] = useState([]);

    useEffect(() => {
        fetchOrder();
    }, [orderId]);

    useEffect(() => {
        if (chatOpen) loadMessages();
    }, [chatOpen]);

    useEffect(() => {
        if (location.hash === '#chat') setChatOpen(true);
    }, [location.hash]);

    useEffect(() => {
        const loadAddonDetails = async () => {
            if (!order?.addon_service_ids || order.addon_service_ids.length === 0) return;
            try {
                const promises = order.addon_service_ids.map((id) => axiosInstance.get(`/api/services/${id}`));
                const results = await Promise.all(promises);
                setAddonDetails(results.map((r) => r.data));
            } catch (err) {
                console.error('Failed to load addon details', err);
            }
        };
        loadAddonDetails();
    }, [order]);

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

    const loadMessages = async () => {
        if (!user?.id) return;
        try {
            setLoadingMessages(true);
            setMessageError('');
            const res = await axiosInstance.get(`/api/messages?order_id=${orderId}&user_id=${user.id}`);
            setMessages(res.data || []);
        } catch (err) {
            console.error('Failed to load messages', err);
            setMessageError(err.response?.data?.detail || 'Failed to load messages');
        } finally {
            setLoadingMessages(false);
        }
    };

    const handleSendMessage = async ({ text }) => {
        if (!text?.trim()) return;
        try {
            setSending(true);
            await axiosInstance.post(`/api/messages?sender_id=${user.id}`, {
                order_id: Number(orderId),
                message_text: text,
            });
            await loadMessages();
        } catch (err) {
            alert(err.response?.data?.detail || 'Failed to send message');
        } finally {
            setSending(false);
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
            alert('Payment released to freelancer. Order completed.');
        } catch (err) {
            alert(err.response?.data?.detail || 'Failed to approve and release payment');
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
            const detail = err.response?.data?.detail;
            const message = typeof detail === 'string' ? detail : 'Failed to request revision';

            if (message.toLowerCase().includes('revision limit reached')) {
                const buy = confirm(`${message}\n\nWould you like to purchase an additional revision now?`);
                if (buy) {
                    const qtyStr = prompt('How many additional revisions would you like to purchase?', '1');
                    const qty = Number(qtyStr || 0);
                    if (Number.isFinite(qty) && qty > 0) {
                        try {
                            await axiosInstance.post(`/api/orders/${orderId}/purchase-revisions?client_id=${user.id}`, {
                                quantity: qty,
                            });
                            await fetchOrder();
                            alert('Additional revisions purchased. You can request a revision now.');
                        } catch (e2) {
                            alert(e2.response?.data?.detail || 'Failed to purchase revisions');
                        }
                        return;
                    }
                }
            }

            alert(message || 'Failed to request revision');
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

    const handleOpenDispute = async () => {
        const reason = prompt('Describe the issue (optional):');
        try {
            setDisputeLoading(true);
            setDisputeError('');
            await axiosInstance.post(`/api/disputes?client_id=${user.id}`, {
                order_id: Number(orderId),
                reason: reason || null,
            });
            await fetchOrder();
            alert('Dispute opened. An admin will review it.');
        } catch (err) {
            console.error('Failed to open dispute', err);
            setDisputeError(err.response?.data?.detail || 'Failed to open dispute');
        } finally {
            setDisputeLoading(false);
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
                            <Typography variant="body1">
                                {order.revision_count}
                                {order.revisions_unlimited
                                    ? ' (Unlimited)'
                                    : typeof order.revisions_allowed === 'number'
                                        ? ` / ${order.revisions_allowed} allowed`
                                        : ''}
                            </Typography>
                            {!order.revisions_unlimited && typeof order.revisions_remaining === 'number' && (
                                <Typography variant="caption" color="text.secondary">
                                    {order.revisions_remaining} revision{order.revisions_remaining === 1 ? '' : 's'} remaining
                                </Typography>
                            )}
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

                    <Paper sx={{ p: 3, mt: 3 }}>
                        <Typography variant="h6" gutterBottom>Add-ons</Typography>
                        <Divider sx={{ mb: 2 }} />
                        {addonDetails.length > 0 ? (
                            addonDetails.map((a) => (
                                <Box key={a.service_id} sx={{ mb: 1 }}>
                                    <Typography sx={{ fontWeight: 'bold' }}>{a.title}</Typography>
                                    <Typography variant="caption" color="text.secondary">{a.description || ''} — ${a.hourly_price ? a.hourly_price.toFixed(2) : '0.00'}</Typography>
                                </Box>
                            ))
                        ) : (
                            <Typography variant="body2">No add-ons selected.</Typography>
                        )}
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
                                    Approve & Release Payment
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

                        {order.requirements && (
                            <>
                                <Divider sx={{ my: 2 }} />
                                <Typography variant="subtitle1" gutterBottom>Project Details</Typography>
                                <Box sx={{ mb: 1 }}>
                                    <Typography variant="body2" color="text.secondary">Description</Typography>
                                    <Typography variant="body1">{order.requirements.description || '—'}</Typography>
                                </Box>
                                <Box sx={{ mb: 1 }}>
                                    <Typography variant="body2" color="text.secondary">Deliverables</Typography>
                                    <Typography variant="body1">{order.requirements.deliverables || '—'}</Typography>
                                </Box>
                                <Box sx={{ mb: 1 }}>
                                    <Typography variant="body2" color="text.secondary">Preferred Style / Approach</Typography>
                                    <Typography variant="body1">{order.requirements.style || '—'}</Typography>
                                </Box>
                                <Box sx={{ mb: 1 }}>
                                    <Typography variant="body2" color="text.secondary">References</Typography>
                                    <Typography variant="body1">{order.requirements.references || '—'}</Typography>
                                </Box>
                                <Box sx={{ mb: 1 }}>
                                    <Typography variant="body2" color="text.secondary">Constraints / Deadlines</Typography>
                                    <Typography variant="body1">{order.requirements.constraints || '—'}</Typography>
                                </Box>
                            </>
                        )}

                        {isClient && !['disputed', 'cancelled'].includes(order.status) && (
                            <Button fullWidth variant="outlined" color="warning" sx={{ mb: 1 }} onClick={handleOpenDispute} disabled={disputeLoading}>
                                {disputeLoading ? 'Opening Dispute...' : 'Open Dispute'}
                            </Button>
                        )}

                        <Button fullWidth variant="outlined" sx={{ mb: 1 }} onClick={() => setChatOpen((prev) => !prev)}>
                            {chatOpen ? 'Hide Chat' : 'Open Chat'}
                        </Button>

                        <Button fullWidth variant="outlined" onClick={() => navigate('/orders')}>
                            Back to Orders
                        </Button>
                    </Paper>

                    {disputeError && (
                        <Alert severity="error" sx={{ mt: 2 }}>{disputeError}</Alert>
                    )}

                    {chatOpen && (
                        <Paper sx={{ p: 3, mt: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                                <Typography variant="h6">Chat</Typography>
                                {loadingMessages && <CircularProgress size={20} />}
                            </Box>
                            {messageError && <Alert severity="error" sx={{ mb: 2 }}>{messageError}</Alert>}
                            <Box sx={{ maxHeight: 320, overflowY: 'auto', pr: 1, mb: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                                {messages.length === 0 && !loadingMessages && (
                                    <Typography color="text.secondary">No messages yet. Say hello!</Typography>
                                )}
                                {messages.map((m) => {
                                    const fromMe = m.sender_id === user.id;
                                    return (
                                        <Box
                                            key={m.message_id}
                                            sx={{
                                                alignSelf: fromMe ? 'flex-end' : 'flex-start',
                                                backgroundColor: fromMe ? 'primary.main' : 'grey.100',
                                                color: fromMe ? '#fff' : 'text.primary',
                                                px: 1.5,
                                                py: 1,
                                                borderRadius: 2,
                                                maxWidth: '80%',
                                            }}
                                        >
                                            <Typography variant="caption" sx={{ opacity: 0.8 }}>
                                                {fromMe ? 'You' : m.sender_name || `User ${m.sender_id}`}
                                            </Typography>
                                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{m.message_text}</Typography>
                                            <Typography variant="caption" sx={{ display: 'block', opacity: 0.7 }}>
                                                {new Date(m.timestamp).toLocaleString()}
                                            </Typography>
                                        </Box>
                                    );
                                })}
                            </Box>
                            <ChatComposer onSend={handleSendMessage} disabled={sending} />
                        </Paper>
                    )}
                </Grid>
            </Grid>
        </Container>
    );
}
<Typography variant="body1">{order.revision_count}</Typography>
            </Box >

{
    order.is_big_order && (
        <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">Milestones</Typography>
            <Typography variant="body1">
                Phase {order.current_phase} of {order.milestone_count}
            </Typography>
        </Box>
    )
}
          </Paper >

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

          <Paper sx={{ p: 3, mt: 3 }}>
            <Typography variant="h6" gutterBottom>Add-ons</Typography>
            <Divider sx={{ mb: 2 }} />
            {addonDetails.length > 0 ? (
              addonDetails.map(a => (
                <Box key={a.service_id} sx={{ mb: 1 }}>
                  <Typography sx={{ fontWeight: 'bold' }}>{a.title}</Typography>
                  <Typography variant="caption" color="text.secondary">{a.description || ''} — ${a.hourly_price ? a.hourly_price.toFixed(2) : '0.00'}</Typography>
                </Box>
              ))
            ) : (
              <Typography variant="body2">No add-ons selected.</Typography>
            )}
          </Paper>
        </Grid >

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
                        Approve & Release Payment
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

            {order.requirements && (
                <>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="subtitle1" gutterBottom>Project Details</Typography>
                    <Box sx={{ mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">Description</Typography>
                        <Typography variant="body1">{order.requirements.description || '—'}</Typography>
                    </Box>
                    <Box sx={{ mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">Deliverables</Typography>
                        <Typography variant="body1">{order.requirements.deliverables || '—'}</Typography>
                    </Box>
                    <Box sx={{ mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">Preferred Style / Approach</Typography>
                        <Typography variant="body1">{order.requirements.style || '—'}</Typography>
                    </Box>
                    <Box sx={{ mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">References</Typography>
                        <Typography variant="body1">{order.requirements.references || '—'}</Typography>
                    </Box>
                    <Box sx={{ mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">Constraints / Deadlines</Typography>
                        <Typography variant="body1">{order.requirements.constraints || '—'}</Typography>
                    </Box>
                </>
            )}

            {isClient && !['disputed', 'cancelled'].includes(order.status) && (
                <Button fullWidth variant="outlined" color="warning" sx={{ mb: 1 }} onClick={handleOpenDispute} disabled={disputeLoading}>
                    {disputeLoading ? 'Opening Dispute...' : 'Open Dispute'}
                </Button>
            )}

            <Button fullWidth variant="outlined" sx={{ mb: 1 }} onClick={() => setChatOpen((prev) => !prev)}>
                {chatOpen ? 'Hide Chat' : 'Open Chat'}
            </Button>

            <Button fullWidth variant="outlined" onClick={() => navigate('/orders')}>
                Back to Orders
            </Button>
        </Paper>

        {disputeError && (
            <Alert severity="error" sx={{ mt: 2 }}>{disputeError}</Alert>
        )}

        {chatOpen && (
            <Paper sx={{ p: 3, mt: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6">Chat</Typography>
                    {loadingMessages && <CircularProgress size={20} />}
                </Box>
                {messageError && <Alert severity="error" sx={{ mb: 2 }}>{messageError}</Alert>}
                <Box sx={{ maxHeight: 320, overflowY: 'auto', pr: 1, mb: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {messages.length === 0 && !loadingMessages && (
                        <Typography color="text.secondary">No messages yet. Say hello!</Typography>
                    )}
                    {messages.map((m) => {
                        const fromMe = m.sender_id === user.id;
                        return (
                            <Box
                                key={m.message_id}
                                sx={{
                                    alignSelf: fromMe ? 'flex-end' : 'flex-start',
                                    backgroundColor: fromMe ? 'primary.main' : 'grey.100',
                                    color: fromMe ? '#fff' : 'text.primary',
                                    px: 1.5,
                                    py: 1,
                                    borderRadius: 2,
                                    maxWidth: '80%',
                                }}
                            >
                                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                                    {fromMe ? 'You' : m.sender_name || `User ${m.sender_id}`}
                                </Typography>
                                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{m.message_text}</Typography>
                                <Typography variant="caption" sx={{ display: 'block', opacity: 0.7 }}>
                                    {new Date(m.timestamp).toLocaleString()}
                                </Typography>
                            </Box>
                        );
                    })}
                </Box>
                <ChatComposer onSend={handleSendMessage} disabled={sending} />
            </Paper>
        )}
    </Grid>
      </Grid >
    </Container >
  );
=======
>>>>>>> Stashed changes
}
