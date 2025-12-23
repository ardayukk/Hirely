import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  Stack,
  Chip,
  TextField,
  Alert,
  Divider,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardHeader,
  Avatar,
  Grid,
  useTheme,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
} from '@mui/lab';
import {
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Message as MessageIcon,
  Gavel as GavelIcon,
  Flag as FlagIcon,
} from '@mui/icons-material';
import { axiosInstance, useAuth } from '../context/Authcontext';

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function AdminDisputes() {
  const { user } = useAuth();
  const theme = useTheme();
  const [disputes, setDisputes] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState('');
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [detailTab, setDetailTab] = useState(0);
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resolveDialog, setResolveDialog] = useState(false);
  const [resolutionData, setResolutionData] = useState({ outcome: '', decision: '' });
  const [adminNotes, setAdminNotes] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    if (user?.role === 'admin') {
      loadDisputes();
      loadAnalytics();
    }
  }, [user]);

  const loadDisputes = async () => {
    try {
      setError('');
      const url = statusFilter ? `/api/disputes?status=${statusFilter}` : '/api/disputes';
      const res = await axiosInstance.get(url);
      setDisputes(res.data || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load disputes');
    }
  };

  const loadAnalytics = async () => {
    try {
      const res = await axiosInstance.get('/api/analytics/summary');
      setAnalytics(res.data);
    } catch (err) {
      console.error('Failed to load analytics', err);
    }
  };

  const loadDisputeDetails = async (disputeId) => {
    try {
      setLoading(true);
      setError('');
      // Load order details including messages
      const res = await axiosInstance.get(`/api/orders/${selectedDispute.order_id}`);
      setOrderData(res.data);
    } catch (err) {
      setError('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDispute = async (dispute) => {
    setSelectedDispute(dispute);
    setDetailTab(0);
    setAdminNotes('');
    setResolutionData({ outcome: '', decision: '' });
    // Load order details
    try {
      setLoading(true);
      const res = await axiosInstance.get(`/api/orders/${dispute.order_id}`);
      setOrderData(res.data);
    } catch (err) {
      setError('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (disputeId) => {
    try {
      setError('');
      await axiosInstance.patch(`/api/disputes/${disputeId}/assign?admin_id=${user.id}`);
      await loadDisputes();
      if (selectedDispute?.dispute_id === disputeId) {
        const updated = disputes.find((d) => d.dispute_id === disputeId);
        setSelectedDispute(updated);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to assign');
    }
  };

  const handleResolveDispute = async () => {
    if (!resolutionData.outcome || !resolutionData.decision) {
      setError('Please select an outcome and enter a decision note');
      return;
    }
    try {
      setError('');
      await axiosInstance.patch(
        `/api/disputes/${selectedDispute.dispute_id}/resolve?admin_id=${user.id}`,
        {
          decision: resolutionData.decision,
          outcome: resolutionData.outcome,
        }
      );
      setResolveDialog(false);
      await loadDisputes();
      const updated = disputes.find((d) => d.dispute_id === selectedDispute.dispute_id);
      if (updated) {
        setSelectedDispute(updated);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to resolve dispute');
    }
  };

  if (!user || user.role !== 'admin') {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="warning">Admin access required.</Alert>
      </Container>
    );
  }

  return (
    <Box
      sx={{
        background: `linear-gradient(135deg, ${theme.palette.background.default} 0%, ${
          theme.palette.mode === 'dark' ? '#1a1a2e' : '#f5f5f5'
        } 100%)`,
        minHeight: '100vh',
        py: 4,
      }}
    >
      <Container maxWidth="xl">
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 1, background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`, backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Dispute Resolution Center
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Review, analyze, and resolve disputes with comprehensive evidence and communication tools
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* Analytics Section */}
        {analytics && (
          <Paper
            sx={{
              p: 3,
              mb: 3,
              borderRadius: 2,
              background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)',
              backdropFilter: 'blur(10px)',
              border: `1px solid ${theme.palette.divider}`,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              System Metrics
            </Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mb: 3 }}>
              <Chip label={`Avg price: $${analytics.overall_avg_price ?? '—'}`} />
              <Chip label={`Dispute rate: ${analytics.overall_dispute_rate ?? '—'}%`} color="warning" />
              <Chip label={`Satisfaction: ${analytics.overall_satisfaction ?? '—'}%`} color="success" />
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              Per Category
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: theme.palette.action.hover }}>
                  <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Avg Order Price</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Dispute Rate</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Avg Rating</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(analytics.per_category || []).map((row) => (
                  <TableRow key={row.category} hover>
                    <TableCell>{row.category}</TableCell>
                    <TableCell>${row.avg_order_price ?? '—'}</TableCell>
                    <TableCell>{row.dispute_rate ?? '—'}%</TableCell>
                    <TableCell>★ {row.avg_rating ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        )}

        {/* Main Content Grid */}
        <Grid container spacing={3}>
          {/* Disputes List */}
          <Grid item xs={12} lg={5}>
            <Paper
              sx={{
                p: 2,
                borderRadius: 2,
                background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)',
                backdropFilter: 'blur(10px)',
                border: `1px solid ${theme.palette.divider}`,
                height: '100%',
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Open Disputes
                </Typography>
                <Button size="small" variant="outlined" onClick={loadDisputes}>
                  Refresh
                </Button>
              </Stack>

              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Filter by Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Filter by Status"
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                  }}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="open">Open</MenuItem>
                  <MenuItem value="resolved">Resolved</MenuItem>
                </Select>
              </FormControl>

              <Stack spacing={1} sx={{ maxHeight: '600px', overflowY: 'auto' }}>
                {disputes.length === 0 ? (
                  <Typography color="text.secondary" align="center" sx={{ py: 3 }}>
                    No disputes to review
                  </Typography>
                ) : (
                  disputes.map((dispute) => (
                    <Card
                      key={dispute.dispute_id}
                      onClick={() => handleSelectDispute(dispute)}
                      sx={{
                        cursor: 'pointer',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        borderLeft: `4px solid ${
                          dispute.status === 'open'
                            ? theme.palette.warning.main
                            : theme.palette.success.main
                        }`,
                        backgroundColor:
                          selectedDispute?.dispute_id === dispute.dispute_id
                            ? theme.palette.action.selected
                            : 'transparent',
                        '&:hover': {
                          transform: 'translateX(4px)',
                          boxShadow: theme.shadows[4],
                        },
                      }}
                    >
                      <CardContent sx={{ p: 1.5 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            Dispute #{dispute.dispute_id}
                          </Typography>
                          <Chip
                            size="small"
                            label={dispute.status}
                            color={dispute.status === 'open' ? 'warning' : 'success'}
                            variant="outlined"
                          />
                        </Stack>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                          Order #{dispute.order_id}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Client: {dispute.client_name || `#${dispute.client_id}`}
                        </Typography>
                      </CardContent>
                    </Card>
                  ))
                )}
              </Stack>
            </Paper>
          </Grid>

          {/* Dispute Details */}
          <Grid item xs={12} lg={7}>
            {selectedDispute ? (
              <Paper
                sx={{
                  p: 3,
                  borderRadius: 2,
                  background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)',
                  backdropFilter: 'blur(10px)',
                  border: `1px solid ${theme.palette.divider}`,
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      Dispute #{selectedDispute.dispute_id}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Order #{selectedDispute.order_id}
                    </Typography>
                  </Box>
                  <Chip
                    label={selectedDispute.status}
                    color={selectedDispute.status === 'open' ? 'warning' : 'success'}
                    size="small"
                  />
                </Stack>

                <Tabs value={detailTab} onChange={(e, val) => setDetailTab(val)} sx={{ mb: 2 }}>
                  <Tab label="Overview" />
                  <Tab label="Order History" />
                  <Tab label="Evidence" />
                  <Tab label="Resolution" />
                </Tabs>

                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <>
                    {/* Overview Tab */}
                    <TabPanel value={detailTab} index={0}>
                      <Stack spacing={2}>
                        <Card variant="outlined">
                          <CardHeader
                            title="Dispute Information"
                            avatar={<FlagIcon sx={{ color: theme.palette.warning.main }} />}
                          />
                          <CardContent>
                            <Grid container spacing={2}>
                              <Grid item xs={12} sm={6}>
                                <Typography variant="caption" color="text.secondary">
                                  Status
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {selectedDispute.status.charAt(0).toUpperCase() +
                                    selectedDispute.status.slice(1)}
                                </Typography>
                              </Grid>
                              <Grid item xs={12} sm={6}>
                                <Typography variant="caption" color="text.secondary">
                                  Assigned Admin
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {selectedDispute.admin_name ||
                                    (selectedDispute.admin_id ? `Admin #${selectedDispute.admin_id}` : 'Unassigned')}
                                </Typography>
                              </Grid>
                              <Grid item xs={12} sm={6}>
                                <Typography variant="caption" color="text.secondary">
                                  Opened Date
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {selectedDispute.opened_date
                                    ? new Date(selectedDispute.opened_date).toLocaleDateString()
                                    : '—'}
                                </Typography>
                              </Grid>
                              <Grid item xs={12} sm={6}>
                                <Typography variant="caption" color="text.secondary">
                                  Resolution Date
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {selectedDispute.resolution_date
                                    ? new Date(selectedDispute.resolution_date).toLocaleDateString()
                                    : '—'}
                                </Typography>
                              </Grid>
                            </Grid>
                          </CardContent>
                        </Card>

                        <Card variant="outlined">
                          <CardHeader
                            title="Parties Involved"
                            avatar={<MessageIcon sx={{ color: theme.palette.info.main }} />}
                          />
                          <CardContent>
                            <Stack spacing={2}>
                              <Stack direction="row" spacing={2} alignItems="center">
                                <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                                  {selectedDispute.client_name?.[0] || 'C'}
                                </Avatar>
                                <Box>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    Client
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {selectedDispute.client_name || `ID: ${selectedDispute.client_id}`}
                                  </Typography>
                                </Box>
                              </Stack>
                              {orderData?.freelancer && (
                                <Stack direction="row" spacing={2} alignItems="center">
                                  <Avatar sx={{ bgcolor: theme.palette.secondary.main }}>
                                    {orderData.freelancer?.name?.[0] || 'F'}
                                  </Avatar>
                                  <Box>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      Freelancer
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {orderData.freelancer?.name || 'Unknown'}
                                    </Typography>
                                  </Box>
                                </Stack>
                              )}
                            </Stack>
                          </CardContent>
                        </Card>

                        <Card variant="outlined">
                          <CardHeader title="Decision Note" />
                          <CardContent>
                            {selectedDispute.status === 'resolved' && selectedDispute.decision ? (
                              <Typography variant="body2">{selectedDispute.decision}</Typography>
                            ) : (
                              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                No verdict has been reached yet. Admin review pending.
                              </Typography>
                            )}
                          </CardContent>
                        </Card>
                      </Stack>
                    </TabPanel>

                    {/* Order History Tab */}
                    <TabPanel value={detailTab} index={1}>
                      {orderData ? (
                        <Stack spacing={2}>
                          <Card variant="outlined">
                            <CardHeader title="Order Timeline" />
                            <CardContent>
                              <Timeline position="alternate">
                                <TimelineItem>
                                  <TimelineOppositeContent color="text.secondary">
                                    {orderData.order_date
                                      ? new Date(orderData.order_date).toLocaleDateString()
                                      : '—'}
                                  </TimelineOppositeContent>
                                  <TimelineSeparator>
                                    <TimelineDot color="primary">
                                      <CheckIcon />
                                    </TimelineDot>
                                    <TimelineConnector />
                                  </TimelineSeparator>
                                  <TimelineContent>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      Order Created
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      Service ordered and payment processed
                                    </Typography>
                                  </TimelineContent>
                                </TimelineItem>

                                <TimelineItem>
                                  <TimelineOppositeContent color="text.secondary">
                                    {orderData.due_date
                                      ? new Date(orderData.due_date).toLocaleDateString()
                                      : '—'}
                                  </TimelineOppositeContent>
                                  <TimelineSeparator>
                                    <TimelineDot>
                                      <CheckIcon />
                                    </TimelineDot>
                                    <TimelineConnector />
                                  </TimelineSeparator>
                                  <TimelineContent>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      Due Date
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      Delivery deadline
                                    </Typography>
                                  </TimelineContent>
                                </TimelineItem>

                                {selectedDispute.status === 'resolved' && (
                                  <TimelineItem>
                                    <TimelineOppositeContent color="text.secondary">
                                      {selectedDispute.resolution_date
                                        ? new Date(selectedDispute.resolution_date).toLocaleDateString()
                                        : '—'}
                                    </TimelineOppositeContent>
                                    <TimelineSeparator>
                                      <TimelineDot color="success">
                                        <CheckIcon />
                                      </TimelineDot>
                                    </TimelineSeparator>
                                    <TimelineContent>
                                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        Resolved
                                      </Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        Dispute settled by admin
                                      </Typography>
                                    </TimelineContent>
                                  </TimelineItem>
                                )}
                              </Timeline>
                            </CardContent>
                          </Card>

                          <Card variant="outlined">
                            <CardHeader title="Order Details" />
                            <CardContent>
                              <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                  <Typography variant="caption" color="text.secondary">
                                    Service
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {orderData.service_title || '—'}
                                  </Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                  <Typography variant="caption" color="text.secondary">
                                    Amount
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    ${orderData.total_price || '—'}
                                  </Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                  <Typography variant="caption" color="text.secondary">
                                    Status
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {orderData.status || '—'}
                                  </Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                  <Typography variant="caption" color="text.secondary">
                                    Revisions
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {orderData.revision_count || 0}
                                  </Typography>
                                </Grid>
                              </Grid>
                            </CardContent>
                          </Card>
                        </Stack>
                      ) : (
                        <Typography color="text.secondary">No order data available</Typography>
                      )}
                    </TabPanel>

                    {/* Evidence Tab */}
                    <TabPanel value={detailTab} index={2}>
                      <Stack spacing={2}>
                        <Card variant="outlined">
                          <CardHeader
                            title="Client Evidence"
                            avatar={<Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                              {selectedDispute.client_name?.[0] || 'C'}
                            </Avatar>}
                          />
                          <CardContent>
                            <Typography variant="body2" color="text.secondary">
                              {selectedDispute.description
                                ? 'Client provided their case: ' + selectedDispute.description
                                : 'No specific evidence provided'}
                            </Typography>
                          </CardContent>
                        </Card>

                        <Card variant="outlined">
                          <CardHeader
                            title="Freelancer Response"
                            subheader={
                              selectedDispute.freelancer_response_at
                                ? `Submitted: ${new Date(selectedDispute.freelancer_response_at).toLocaleString()}`
                                : null
                            }
                            avatar={<Avatar sx={{ bgcolor: theme.palette.secondary.main }}>
                              {orderData?.freelancer?.name?.[0] || 'F'}
                            </Avatar>}
                          />
                          <CardContent>
                            <Typography variant="body2" color="text.secondary">
                              {selectedDispute.freelancer_response ||
                                'Freelancer has not yet provided their response'}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Stack>
                    </TabPanel>

                    {/* Resolution Tab */}
                    <TabPanel value={detailTab} index={3}>
                      {selectedDispute.status === 'resolved' ? (
                        <Stack spacing={2}>
                          <Alert severity="success">
                            This dispute has been resolved. {selectedDispute.decision}
                          </Alert>
                          <Card variant="outlined">
                            <CardHeader title="Resolution Details" />
                            <CardContent>
                              <Typography variant="body2">
                                <strong>Decision:</strong> {selectedDispute.decision}
                              </Typography>
                            </CardContent>
                          </Card>
                        </Stack>
                      ) : (
                        <Stack spacing={2}>
                          <Stack
                            direction="row"
                            spacing={1}
                            sx={{
                              p: 2,
                              bgcolor: theme.palette.action.hover,
                              borderRadius: 1,
                            }}
                          >
                            {!selectedDispute.admin_id ? (
                              <Button
                                variant="contained"
                                size="small"
                                onClick={() => handleAssign(selectedDispute.dispute_id)}
                              >
                                Assign to Me
                              </Button>
                            ) : selectedDispute.admin_id === user.id ? (
                              <Button
                                variant="contained"
                                color="success"
                                size="small"
                                onClick={() => setResolveDialog(true)}
                                startIcon={<GavelIcon />}
                              >
                                Resolve Dispute
                              </Button>
                            ) : (
                              <Chip label={`Assigned to ${selectedDispute.admin_name}`} />
                            )}
                          </Stack>

                          <TextField
                            fullWidth
                            multiline
                            rows={4}
                            label="Internal Notes"
                            placeholder="Add notes about this dispute for future reference..."
                            value={adminNotes}
                            onChange={(e) => setAdminNotes(e.target.value)}
                            variant="outlined"
                          />

                          <Typography variant="caption" color="text.secondary">
                            Use the "Resolve Dispute" button to submit your final decision
                          </Typography>
                        </Stack>
                      )}
                    </TabPanel>
                  </>
                )}
              </Paper>
            ) : (
              <Paper
                sx={{
                  p: 4,
                  textAlign: 'center',
                  borderRadius: 2,
                  background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)',
                  backdropFilter: 'blur(10px)',
                  border: `1px solid ${theme.palette.divider}`,
                }}
              >
                <Typography color="text.secondary">Select a dispute to view details</Typography>
              </Paper>
            )}
          </Grid>
        </Grid>

        {/* Resolution Dialog */}
        <Dialog open={resolveDialog} onClose={() => setResolveDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Resolve Dispute #{selectedDispute?.dispute_id}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Resolution Outcome</InputLabel>
                <Select
                  value={resolutionData.outcome}
                  label="Resolution Outcome"
                  onChange={(e) =>
                    setResolutionData({ ...resolutionData, outcome: e.target.value })
                  }
                >
                  <MenuItem value="refund">Refund Client</MenuItem>
                  <MenuItem value="release">Release Payment to Freelancer</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Resolution Note"
                placeholder="Explain your decision and reasoning..."
                value={resolutionData.decision}
                onChange={(e) =>
                  setResolutionData({ ...resolutionData, decision: e.target.value })
                }
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setResolveDialog(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleResolveDispute}>
              Resolve Dispute
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}
