import React, { useEffect, useState } from 'react';
import { Container, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody, Button, Stack, Chip, TextField, Alert, Divider, Box, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemText } from '@mui/material';
import { axiosInstance, useAuth } from '../context/Authcontext';

export default function AdminDisputes() {
  const { user } = useAuth();
  const [disputes, setDisputes] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [notes, setNotes] = useState('');
  const [statusFilter, setStatusFilter] = useState('OPEN');

  useEffect(() => {
    if (user?.role === 'admin') {
      loadDisputes();
      loadAnalytics();
    }
  }, [user]);

  const loadDisputes = async () => {
    try {
      setError('');
      const res = await axiosInstance.get(`/api/admin/disputes?status=${statusFilter}`);
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

  const handleView = async (disputeId) => {
    try {
      setError('');
      const res = await axiosInstance.get(`/api/admin/disputes/${disputeId}`);
      setDetail(res.data);
      setNotes(res.data?.header?.admin_notes || '');
      setDetailOpen(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load detail');
    }
  };

  const handleSaveNotes = async () => {
    if (!detail) return;
    try {
      await axiosInstance.put(`/api/admin/disputes/${detail.header.dispute_id}/notes`, null, { params: { notes, admin_id: user.id } });
      alert('Notes saved');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to save notes');
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
          <Stack direction="row" spacing={1}>
            <TextField size="small" label="Status" value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value)} sx={{ width: 140 }} />
            <Button variant="outlined" onClick={loadDisputes}>Refresh</Button>
          </Stack>
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
                <TableCell><Chip label={d.status} color={String(d.status).toUpperCase() === 'RESOLVED' ? 'success' : 'warning'} /></TableCell>
                <TableCell>{d.order_id}</TableCell>
                <TableCell>{d.client_name || d.client_id}</TableCell>
                <TableCell>{d.freelancer_name || d.freelancer_id || '—'}</TableCell>
                <TableCell sx={{ maxWidth: 200 }}>{d.decision || d.description || '—'}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1}>
                    <Button size="small" variant="text" onClick={() => handleView(d.dispute_id)}>View</Button>
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

      <Dialog fullWidth maxWidth="md" open={detailOpen} onClose={()=>setDetailOpen(false)}>
        <DialogTitle>Dispute Detail</DialogTitle>
        <DialogContent dividers>
          {!detail ? (
            <Typography>Loading...</Typography>
          ) : (
            <Stack spacing={2}>
              <Paper sx={{ p:2 }}>
                <Typography variant="h6">Header</Typography>
                <Typography>ID: {detail.header.dispute_id} • Status: {detail.header.status} • Opened: {new Date(detail.header.opened_at).toLocaleString()}</Typography>
                <Typography>Order: {detail.header.order_id} ({detail.header.order_status}) • Total: {detail.header.total_price ?? '—'}</Typography>
                <Typography>Client: {detail.header.client_name || detail.header.client_id} • Freelancer: {detail.header.freelancer_name || detail.header.freelancer_id}</Typography>
                <Typography>Description: {detail.header.description || '—'}</Typography>
              </Paper>

              <Paper sx={{ p:2 }}>
                <Typography variant="h6" gutterBottom>Timeline</Typography>
                <List dense>
                  {(detail.timeline || []).map((t, idx)=> (
                    <ListItem key={idx}>
                      <ListItemText primary={`${t.event_type} • ${new Date(t.event_time).toLocaleString()}`} secondary={`${t.details || ''}${t.actor_id ? ` • actor ${t.actor_id}` : ''}`} />
                    </ListItem>
                  ))}
                </List>
              </Paper>

              <Paper sx={{ p:2 }}>
                <Typography variant="h6" gutterBottom>Evidence</Typography>
                <List dense>
                  {(detail.evidence || []).map(e=> (
                    <ListItem key={e.evidence_id}>
                      <ListItemText primary={`${e.description || 'Evidence'} • by ${e.submitted_by_user_id}`} secondary={e.file_url} />
                    </ListItem>
                  ))}
                </List>
              </Paper>

              <Paper sx={{ p:2 }}>
                <Typography variant="h6" gutterBottom>Messages</Typography>
                <List dense>
                  {(detail.messages || []).map(m=> (
                    <ListItem key={m.message_id}>
                      <ListItemText primary={`${new Date(m.timestamp).toLocaleString()} • ${m.sender_id} → ${m.receiver_id}`} secondary={m.message_text} />
                    </ListItem>
                  ))}
                </List>
              </Paper>

              <Paper sx={{ p:2 }}>
                <Typography variant="h6" gutterBottom>Deliveries</Typography>
                <List dense>
                  {(detail.deliverables || []).map(d=> (
                    <ListItem key={d.delivery_id}>
                      <ListItemText primary={`${new Date(d.created_at).toLocaleString()} • by ${d.freelancer_id}`} secondary={d.message || ''} />
                    </ListItem>
                  ))}
                </List>
              </Paper>

              <Paper sx={{ p:2 }}>
                <Typography variant="h6" gutterBottom>Revisions</Typography>
                <List dense>
                  {(detail.revisions || []).map(r=> (
                    <ListItem key={r.revision_id}>
                      <ListItemText primary={`${new Date(r.created_at).toLocaleString()} • #${r.revision_no}`} secondary={r.revision_text || ''} />
                    </ListItem>
                  ))}
                </List>
              </Paper>

              <Paper sx={{ p:2 }}>
                <Typography variant="h6" gutterBottom>Admin Notes</Typography>
                <TextField multiline minRows={3} fullWidth value={notes} onChange={(e)=>setNotes(e.target.value)} placeholder="Write internal notes..." />
              </Paper>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSaveNotes} variant="contained">Save Notes</Button>
          <Button onClick={()=>setDetailOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
