import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  Card,
  CardContent,
  Grid,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  AccountBalance as BankIcon,
  PaymentOutlined as PayPalIcon,
  CreditCard as CardIcon,
  Delete as DeleteIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { axiosInstance, useAuth } from '../context/Authcontext';

const MIN_WITHDRAWAL = 10;
const FEE_PERCENT = 2;
const FEE_FIXED = 1;

export default function Withdrawals() {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [methods, setMethods] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Add Method Dialog
  const [methodDialogOpen, setMethodDialogOpen] = useState(false);
  const [methodForm, setMethodForm] = useState({
    method_type: 'bank_account',
    account_holder_name: '',
    account_number: '',
    bank_name: '',
    swift_code: '',
    paypal_email: '',
    is_default: false,
  });
  const [addingMethod, setAddingMethod] = useState(false);
  
  // Withdrawal Dialog
  const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState(false);
  const [withdrawalForm, setWithdrawalForm] = useState({
    withdrawal_method_id: '',
    amount: '',
  });
  const [requestingWithdrawal, setRequestingWithdrawal] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Load wallet balance
      const userRes = await axiosInstance.get(`/api/users/${user.id}`);
      setBalance(userRes.data.wallet_balance || 0);
      
      // Load withdrawal methods
      const methodsRes = await axiosInstance.get(`/api/withdrawals/methods?freelancer_id=${user.id}`);
      setMethods(methodsRes.data);
      
      // Load withdrawal history
      const withdrawalsRes = await axiosInstance.get(`/api/withdrawals?freelancer_id=${user.id}`);
      setWithdrawals(withdrawalsRes.data);
      
    } catch (err) {
      console.error('Failed to load data', err);
      setError(err.response?.data?.detail || 'Failed to load withdrawal data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMethod = async () => {
    try {
      setAddingMethod(true);
      setError('');
      
      await axiosInstance.post(
        `/api/withdrawals/methods?freelancer_id=${user.id}`,
        methodForm
      );
      
      setMethodDialogOpen(false);
      setMethodForm({
        method_type: 'bank_account',
        account_holder_name: '',
        account_number: '',
        bank_name: '',
        swift_code: '',
        paypal_email: '',
        is_default: false,
      });
      
      await loadData();
    } catch (err) {
      console.error('Failed to add method', err);
      setError(err.response?.data?.detail || 'Failed to add withdrawal method');
    } finally {
      setAddingMethod(false);
    }
  };

  const handleDeleteMethod = async (methodId) => {
    if (!confirm('Are you sure you want to delete this withdrawal method?')) return;
    
    try {
      setError('');
      await axiosInstance.delete(`/api/withdrawals/methods/${methodId}?freelancer_id=${user.id}`);
      await loadData();
    } catch (err) {
      console.error('Failed to delete method', err);
      setError(err.response?.data?.detail || 'Failed to delete withdrawal method');
    }
  };

  const calculateFee = (amount) => {
    const amt = parseFloat(amount) || 0;
    const percentFee = amt * (FEE_PERCENT / 100);
    const totalFee = percentFee + FEE_FIXED;
    return totalFee.toFixed(2);
  };

  const calculateNet = (amount) => {
    const amt = parseFloat(amount) || 0;
    const fee = parseFloat(calculateFee(amount));
    return (amt - fee).toFixed(2);
  };

  const handleRequestWithdrawal = async () => {
    try {
      setRequestingWithdrawal(true);
      setError('');
      
      await axiosInstance.post(
        `/api/withdrawals?freelancer_id=${user.id}`,
        {
          withdrawal_method_id: parseInt(withdrawalForm.withdrawal_method_id),
          amount: parseFloat(withdrawalForm.amount),
        }
      );
      
      setWithdrawalDialogOpen(false);
      setWithdrawalForm({ withdrawal_method_id: '', amount: '' });
      
      await loadData();
    } catch (err) {
      console.error('Failed to request withdrawal', err);
      setError(err.response?.data?.detail || 'Failed to request withdrawal');
    } finally {
      setRequestingWithdrawal(false);
    }
  };

  const handleCancelWithdrawal = async (withdrawalId) => {
    if (!confirm('Are you sure you want to cancel this withdrawal?')) return;
    
    try {
      setError('');
      await axiosInstance.patch(`/api/withdrawals/${withdrawalId}/cancel?freelancer_id=${user.id}`);
      await loadData();
    } catch (err) {
      console.error('Failed to cancel withdrawal', err);
      setError(err.response?.data?.detail || 'Failed to cancel withdrawal');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'processing': return 'info';
      case 'pending': return 'warning';
      case 'failed': return 'error';
      case 'cancelled': return 'default';
      default: return 'default';
    }
  };

  const getMethodIcon = (type) => {
    switch (type) {
      case 'bank_account': return <BankIcon />;
      case 'paypal': return <PayPalIcon />;
      case 'stripe': return <CardIcon />;
      default: return <BankIcon />;
    }
  };

  if (loading) {
    return <Container><Typography>Loading...</Typography></Container>;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>Withdrawal Management</Typography>
        <Typography variant="body2" color="text.secondary">
          Manage your earnings and withdrawal methods
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Balance Card */}
      <Card sx={{ mb: 4, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <CardContent>
          <Typography variant="h6" sx={{ opacity: 0.9 }}>Available Balance</Typography>
          <Typography variant="h3" sx={{ my: 2, fontWeight: 'bold' }}>
            ${parseFloat(balance).toFixed(2)}
          </Typography>
          <Button
            variant="contained"
            color="inherit"
            startIcon={<AddIcon />}
            onClick={() => setWithdrawalDialogOpen(true)}
            disabled={methods.length === 0 || balance < MIN_WITHDRAWAL}
            sx={{ mt: 1 }}
          >
            Request Withdrawal
          </Button>
          {methods.length === 0 && (
            <Typography variant="caption" display="block" sx={{ mt: 1, opacity: 0.8 }}>
              Add a withdrawal method first
            </Typography>
          )}
          {balance < MIN_WITHDRAWAL && methods.length > 0 && (
            <Typography variant="caption" display="block" sx={{ mt: 1, opacity: 0.8 }}>
              Minimum withdrawal: ${MIN_WITHDRAWAL}
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Withdrawal Methods */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">Withdrawal Methods</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setMethodDialogOpen(true)}
          >
            Add Method
          </Button>
        </Box>

        {methods.length === 0 ? (
          <Alert severity="info">No withdrawal methods added yet. Add one to start withdrawing funds.</Alert>
        ) : (
          <Grid container spacing={2}>
            {methods.map((method) => (
              <Grid item xs={12} md={6} key={method.method_id}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {getMethodIcon(method.method_type)}
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                            {method.account_holder_name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {method.method_type === 'bank_account' && `${method.bank_name} - ****${method.account_number?.slice(-4)}`}
                            {method.method_type === 'paypal' && method.paypal_email}
                            {method.method_type === 'stripe' && 'Stripe Account'}
                          </Typography>
                          {method.is_default && (
                            <Chip label="Default" size="small" color="primary" sx={{ mt: 0.5 }} />
                          )}
                        </Box>
                      </Box>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteMethod(method.method_id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>

      {/* Withdrawal History */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>Withdrawal History</Typography>
        
        {withdrawals.length === 0 ? (
          <Alert severity="info">No withdrawal requests yet.</Alert>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Fee</TableCell>
                  <TableCell>Net Amount</TableCell>
                  <TableCell>Method</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {withdrawals.map((w) => (
                  <TableRow key={w.withdrawal_id}>
                    <TableCell>
                      {new Date(w.requested_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>${parseFloat(w.amount).toFixed(2)}</TableCell>
                    <TableCell>${parseFloat(w.fee).toFixed(2)}</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>
                      ${parseFloat(w.net_amount).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getMethodIcon(w.method_type)}
                        <Typography variant="body2">
                          {w.method_type === 'bank_account' && w.bank_name}
                          {w.method_type === 'paypal' && 'PayPal'}
                          {w.method_type === 'stripe' && 'Stripe'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={w.status.toUpperCase()}
                        color={getStatusColor(w.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {(w.status === 'pending' || w.status === 'processing') && (
                        <Tooltip title="Cancel Withdrawal">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleCancelWithdrawal(w.withdrawal_id)}
                          >
                            <CancelIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Add Method Dialog */}
      <Dialog open={methodDialogOpen} onClose={() => !addingMethod && setMethodDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Withdrawal Method</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Method Type</InputLabel>
              <Select
                value={methodForm.method_type}
                label="Method Type"
                onChange={(e) => setMethodForm({ ...methodForm, method_type: e.target.value })}
              >
                <MenuItem value="bank_account">Bank Account</MenuItem>
                <MenuItem value="paypal">PayPal</MenuItem>
                <MenuItem value="stripe">Stripe</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Account Holder Name"
              value={methodForm.account_holder_name}
              onChange={(e) => setMethodForm({ ...methodForm, account_holder_name: e.target.value })}
              required
              fullWidth
            />

            {methodForm.method_type === 'bank_account' && (
              <>
                <TextField
                  label="Bank Name"
                  value={methodForm.bank_name}
                  onChange={(e) => setMethodForm({ ...methodForm, bank_name: e.target.value })}
                  fullWidth
                />
                <TextField
                  label="Account Number"
                  value={methodForm.account_number}
                  onChange={(e) => setMethodForm({ ...methodForm, account_number: e.target.value })}
                  fullWidth
                />
                <TextField
                  label="SWIFT/BIC Code"
                  value={methodForm.swift_code}
                  onChange={(e) => setMethodForm({ ...methodForm, swift_code: e.target.value })}
                  fullWidth
                />
              </>
            )}

            {methodForm.method_type === 'paypal' && (
              <TextField
                label="PayPal Email"
                type="email"
                value={methodForm.paypal_email}
                onChange={(e) => setMethodForm({ ...methodForm, paypal_email: e.target.value })}
                fullWidth
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMethodDialogOpen(false)} disabled={addingMethod}>
            Cancel
          </Button>
          <Button
            onClick={handleAddMethod}
            variant="contained"
            disabled={addingMethod || !methodForm.account_holder_name}
          >
            {addingMethod ? 'Adding...' : 'Add Method'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Request Withdrawal Dialog */}
      <Dialog open={withdrawalDialogOpen} onClose={() => !requestingWithdrawal && setWithdrawalDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Request Withdrawal</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <Alert severity="info">
              Withdrawal fee: {FEE_PERCENT}% + ${FEE_FIXED} | Minimum: ${MIN_WITHDRAWAL}
            </Alert>

            <FormControl fullWidth>
              <InputLabel>Withdrawal Method</InputLabel>
              <Select
                value={withdrawalForm.withdrawal_method_id}
                label="Withdrawal Method"
                onChange={(e) => setWithdrawalForm({ ...withdrawalForm, withdrawal_method_id: e.target.value })}
              >
                {methods.map((m) => (
                  <MenuItem key={m.method_id} value={m.method_id}>
                    {m.account_holder_name} - {m.method_type === 'bank_account' ? m.bank_name : m.method_type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Amount"
              type="number"
              value={withdrawalForm.amount}
              onChange={(e) => setWithdrawalForm({ ...withdrawalForm, amount: e.target.value })}
              inputProps={{ min: MIN_WITHDRAWAL, max: balance, step: 0.01 }}
              fullWidth
            />

            {withdrawalForm.amount && (
              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="body2" color="text.secondary">Amount: ${parseFloat(withdrawalForm.amount).toFixed(2)}</Typography>
                <Typography variant="body2" color="text.secondary">Fee: ${calculateFee(withdrawalForm.amount)}</Typography>
                <Divider sx={{ my: 1 }} />
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                  You will receive: ${calculateNet(withdrawalForm.amount)}
                </Typography>
              </Paper>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWithdrawalDialogOpen(false)} disabled={requestingWithdrawal}>
            Cancel
          </Button>
          <Button
            onClick={handleRequestWithdrawal}
            variant="contained"
            disabled={
              requestingWithdrawal ||
              !withdrawalForm.withdrawal_method_id ||
              !withdrawalForm.amount ||
              parseFloat(withdrawalForm.amount) < MIN_WITHDRAWAL ||
              parseFloat(withdrawalForm.amount) > balance
            }
          >
            {requestingWithdrawal ? 'Requesting...' : 'Request Withdrawal'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
