import React, { useEffect, useState } from 'react';
import { Container, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody, Button, Stack, Chip, TextField, Alert, Divider, Box } from '@mui/material';
import { axiosInstance, useAuth } from '../context/Authcontext';

export default function AdminDisputes() {
  const { user } = useAuth();
  const [disputes, setDisputes] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.role === 'admin') {
      loadDisputes();
      loadAnalytics();
    }
  }, [user]);

  const loadDisputes = async () => {
    try {
      setError('');
      const res = await axiosInstance.get('/api/disputes');
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

  const handleAssign = async (disputeId) => {
    try {
      setError('');
      await axiosInstance.patch(`/api/disputes/${disputeId}/assign?admin_id=${user.id}`);
      alert(`Dispute ${disputeId} assigned to you`);
      await loadDisputes();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to assign');
      alert(err.response?.data?.detail || 'Failed to assign');
    }
  };

  const handleResolve = async (disputeId, outcome) => {
    const decision = prompt('Resolution note:');
    if (!decision) return;
    try {
      setError('');
      await axiosInstance.patch(`/api/disputes/${disputeId}/resolve?admin_id=${user.id}`, {
        decision,
        outcome,
      });
      alert(`Dispute ${disputeId} resolved with outcome: ${outcome}`);
      await loadDisputes();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to resolve');
      alert(err.response?.data?.detail || 'Failed to resolve');
    }
  };

  if (!user || user.role !== 'admin') {
    return <Container sx={{ mt: 4 }}><Alert severity="warning">Admin access required.</Alert></Container>;
  }

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>Admin Disputes & Analytics</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {analytics && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>System Metrics</Typography>
          <Stack direction="row" spacing={2} flexWrap="wrap">
            <Chip label={`Avg price: ${analytics.overall_avg_price ?? '—'}`} />
            <Chip label={`Dispute rate: ${analytics.overall_dispute_rate ?? '—'}`} color="warning" />
            <Chip label={`Satisfaction: ${analytics.overall_satisfaction ?? '—'}`} color="success" />
          </Stack>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1">Per Category</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Category</TableCell>
                <TableCell>Avg Order Price</TableCell>
                <TableCell>Dispute Rate</TableCell>
                <TableCell>Avg Rating</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(analytics.per_category || []).map((row) => (
                <TableRow key={row.category}>
                  <TableCell>{row.category}</TableCell>
                  <TableCell>{row.avg_order_price ?? '—'}</TableCell>
                  <TableCell>{row.dispute_rate ?? '—'}</TableCell>
                  <TableCell>{row.avg_rating ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Paper sx={{ p: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2}>
          <Typography variant="h6">Disputes</Typography>
          <Button variant="outlined" onClick={loadDisputes}>Refresh</Button>
        </Stack>

        <Table size="small" sx={{ mt: 2 }}>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Order</TableCell>
              <TableCell>Client</TableCell>
              <TableCell>Admin</TableCell>
              <TableCell>Decision</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {disputes.map((d) => (
              <TableRow key={d.dispute_id}>
                <TableCell>{d.dispute_id}</TableCell>
                <TableCell><Chip label={d.status} color={d.status === 'resolved' ? 'success' : 'warning'} /></TableCell>
                <TableCell>{d.order_id}</TableCell>
                <TableCell>{d.client_name || d.client_id}</TableCell>
                <TableCell>{d.admin_name || d.admin_id || 'Unassigned'}</TableCell>
                <TableCell sx={{ maxWidth: 200 }}>{d.decision || '—'}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1}>
                    <Button size="small" variant="outlined" onClick={() => handleAssign(d.dispute_id)}>Assign me</Button>
                    <Button size="small" variant="contained" color="error" onClick={() => handleResolve(d.dispute_id, 'refund')}>Refund</Button>
                    <Button size="small" variant="contained" color="success" onClick={() => handleResolve(d.dispute_id, 'release')}>Release</Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {disputes.length === 0 && (
              <TableRow><TableCell colSpan={7}><Typography color="text.secondary">No disputes.</Typography></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Container>
  );
}
