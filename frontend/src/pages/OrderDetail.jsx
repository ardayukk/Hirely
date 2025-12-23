import React, { useEffect, useState } from 'react';
import { Container, Typography, Box, Paper, Divider, Button, Chip, Grid, Alert, CircularProgress, TextField } from '@mui/material';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { axiosInstance, useAuth } from '../context/Authcontext';
import ChatComposer from '../components/ChatComposer';

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
  const [deliveryFile, setDeliveryFile] = useState(null);
  const [deliveryNote, setDeliveryNote] = useState('');
  const [deliverySending, setDeliverySending] = useState(false);
  const [deliveryError, setDeliveryError] = useState('');
  const [disputeResponse, setDisputeResponse] = useState('');
  const [disputeResponseLoading, setDisputeResponseLoading] = useState(false);
  const [disputeResponseError, setDisputeResponseError] = useState('');

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  useEffect(() => {
    if (chatOpen) {
      loadMessages();
    }
  }, [chatOpen]);

  useEffect(() => {
    if (location.hash === '#chat') {
      setChatOpen(true);
    }
  }, [location.hash]);

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

  const handleSendMessage = async ({ text, file }) => {
    try {
      setSending(true);
      if (file) {
        const form = new FormData();
        form.append('order_id', String(orderId));
        form.append('message_text', text && text.trim() ? text : '');
        form.append('file', file);
        await axiosInstance.post(`/api/messages/upload?sender_id=${user.id}`, form, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        if (!text?.trim()) return;
        await axiosInstance.post(`/api/messages?sender_id=${user.id}`, {
          order_id: Number(orderId),
          message_text: text,
        });
      }
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
    if (!deliveryFile) {
      setDeliveryError('Please attach the final file before delivering.');
      return;
    }
    try {
      setDeliverySending(true);
      setDeliveryError('');

      // First, upload the delivery file via messages so both sides can access it
      const form = new FormData();
      form.append('order_id', String(orderId));
      form.append('message_text', deliveryNote || 'Final delivery');
      form.append('file', deliveryFile);
      await axiosInstance.post(`/api/messages/upload?sender_id=${user.id}`, form);

      // Then mark the order as delivered
      await axiosInstance.patch(`/api/orders/${orderId}/deliver?freelancer_id=${user.id}`);

      await fetchOrder();
      await loadMessages();
      setDeliveryFile(null);
      setDeliveryNote('');
      alert('Order marked as delivered');
    } catch (err) {
      const detail = err.response?.data?.detail || 'Failed to deliver order';
      setDeliveryError(detail);
    } finally {
      setDeliverySending(false);
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

  const handleSubmitDisputeResponse = async () => {
    if (!disputeResponse?.trim()) {
      setDisputeResponseError('Please provide your response');
      return;
    }
    try {
      setDisputeResponseLoading(true);
      setDisputeResponseError('');
      // Find dispute_id for this order
      const disputesRes = await axiosInstance.get('/api/disputes');
      const dispute = disputesRes.data?.find(d => d.order_id === Number(orderId));
      if (!dispute) {
        throw new Error('Dispute not found');
      }
      await axiosInstance.post(
        `/api/disputes/${dispute.dispute_id}/freelancer-response?freelancer_id=${user.id}`,
        { response: disputeResponse }
      );
      setDisputeResponse('');
      alert('Response submitted successfully');
      await fetchOrder();
    } catch (err) {
      console.error('Failed to submit response', err);
      console.error('Error details:', err.response?.data);
      setDisputeResponseError(err.response?.data?.detail || err.message || 'Failed to submit response');
    } finally {
      setDisputeResponseLoading(false);
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
              <>
                <Box sx={{ border: '1px dashed', borderColor: 'grey.400', borderRadius: 1, p: 2, mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Attach final delivery</Typography>
                  <Button
                    variant="outlined"
                    component="label"
                    sx={{ mr: 1, mb: 1 }}
                    disabled={deliverySending}
                  >
                    {deliveryFile ? 'Change file' : 'Choose file'}
                    <input
                      type="file"
                      hidden
                      onChange={(e) => setDeliveryFile(e.target.files?.[0] || null)}
                    />
                  </Button>
                  {deliveryFile && (
                    <Typography variant="body2" sx={{ mb: 1 }}>{deliveryFile.name}</Typography>
                  )}
                  <TextField
                    fullWidth
                    multiline
                    minRows={2}
                    placeholder="Optional delivery note"
                    value={deliveryNote}
                    onChange={(e) => setDeliveryNote(e.target.value)}
                    disabled={deliverySending}
                  />
                  <Button
                    fullWidth
                    variant="contained"
                    sx={{ mt: 1 }}
                    onClick={handleDeliver}
                    disabled={deliverySending}
                  >
                    {deliverySending ? 'Uploading...' : 'Upload & Mark as Delivered'}
                  </Button>
                  {deliveryError && (
                    <Alert severity="error" sx={{ mt: 1 }}>{deliveryError}</Alert>
                  )}
                </Box>
              </>
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

            {isClient && !['disputed', 'cancelled'].includes(order.status) && (
              <Button fullWidth variant="outlined" color="warning" sx={{ mb: 1 }} onClick={handleOpenDispute} disabled={disputeLoading}>
                {disputeLoading ? 'Opening Dispute...' : 'Open Dispute'}
              </Button>
            )}

            {isFreelancer && order.status === 'disputed' && (
              <Paper sx={{ p: 2, mb: 1, border: '2px solid', borderColor: 'warning.main' }}>
                <Typography variant="subtitle2" gutterBottom color="warning.main">
                  ⚠️ Respond to Dispute
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }} color="text.secondary">
                  This order is disputed. Provide your side of the story:
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  placeholder="Explain your position on this dispute..."
                  value={disputeResponse}
                  onChange={(e) => setDisputeResponse(e.target.value)}
                  disabled={disputeResponseLoading}
                  sx={{ mb: 1 }}
                />
                <Button
                  fullWidth
                  variant="contained"
                  color="warning"
                  onClick={handleSubmitDisputeResponse}
                  disabled={disputeResponseLoading || !disputeResponse?.trim()}
                >
                  {disputeResponseLoading ? 'Submitting...' : 'Submit Response'}
                </Button>
                {disputeResponseError && (
                  <Alert severity="error" sx={{ mt: 1 }}>{disputeResponseError}</Alert>
                )}
              </Paper>
            )}

            <Button fullWidth variant="outlined" sx={{ mb: 1 }} onClick={() => setChatOpen((prev) => !prev)}>
              {chatOpen ? 'Hide Chat' : 'Open Chat'}
            </Button>

            <Button fullWidth variant="outlined" sx={{ mb: 1 }} onClick={() => navigate('/inbox')}>
              Go to Inbox
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
                      {m.file_id && m.file_name && (
                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                          {(() => {
                            const fileUrl = `${axiosInstance.defaults.baseURL}/api/messages/files/${m.file_id}`;
                            return (
                              <>Attachment: <a href={fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: fromMe ? '#fff' : undefined }}>{m.file_name}</a></>
                            );
                          })()}
                        </Typography>
                      )}
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
