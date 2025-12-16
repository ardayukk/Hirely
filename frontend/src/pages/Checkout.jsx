import React, { useState } from 'react';
import { Container, Grid, Box, Typography, Select, MenuItem, TextField, IconButton } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import CheckoutTiers from '../components/CheckoutTiers';
import RequirementsEditor from '../components/RequirementsEditor';
import PriceSummary from '../components/PriceSummary';
import { useMockApi } from '../context/MockApiProvider';

const demoTiers = [
  { id: 't1', name: 'Basic', price: 80, deliveryDays: 3 },
  { id: 't2', name: 'Standard', price: 150, deliveryDays: 5 },
  { id: 't3', name: 'Premium', price: 350, deliveryDays: 10 },
];

export default function Checkout() {
  const { createOrder } = useMockApi();
  const [tier, setTier] = useState('t2');
  const [requirements, setRequirements] = useState({ short: '', detail: '' });
  const [price, setPrice] = useState({ subtotal: 150, fees: 5, tax: 0, total: 155, currency: 'USD' });
  const [orderType, setOrderType] = useState('small');
  const [smallDeliveryDate, setSmallDeliveryDate] = useState('');
  const [bigDeliverables, setBigDeliverables] = useState([{ description: '', dueDate: '', amount: 0 }]);

  const handlePay = async () => {
    const tierObj = demoTiers.find(t=>t.id===tier);
    const payload = {
      title: requirements.short || 'New project',
      tier: tierObj,
      price,
      orderType,
    };
    if (orderType === 'small') {
      payload.deliveryDate = smallDeliveryDate || null;
      payload.amount = price.total;
    } else {
      payload.deliverables = bigDeliverables.map(d => ({ description: d.description, dueDate: d.dueDate, amount: Number(d.amount) || 0 }));
    }

    const order = await createOrder(payload);
    // navigate to order detail in a full app; here we just console.log
    console.log('order created', order);
    alert('Order created (mock): ' + order.id);
  };

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>Checkout</Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1">Order Type</Typography>
            <Select value={orderType} onChange={(e)=>setOrderType(e.target.value)} size="small" sx={{ mt: 1 }}>
              <MenuItem value="small">Small order (single delivery)</MenuItem>
              <MenuItem value="big">Big order (multiple deliverables)</MenuItem>
            </Select>
          </Box>
          <CheckoutTiers tiers={demoTiers} value={tier} onChange={setTier} />
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6">Requirements</Typography>
            <RequirementsEditor value={requirements} onChange={setRequirements} onAttach={() => alert('Attach not implemented in mock')} />
          </Box>

          {orderType === 'small' ? (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1">Delivery</Typography>
              <TextField label="Delivery date" type="date" size="small" InputLabelProps={{ shrink: true }} value={smallDeliveryDate} onChange={(e)=>setSmallDeliveryDate(e.target.value)} sx={{ mt: 1 }} />
            </Box>
          ) : (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1">Deliverables</Typography>
              {bigDeliverables.map((d, idx) => (
                <Box key={idx} sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 1 }}>
                  <TextField placeholder="Description" size="small" value={d.description} onChange={(e)=>{ const arr = [...bigDeliverables]; arr[idx].description = e.target.value; setBigDeliverables(arr); }} />
                  <TextField type="date" size="small" value={d.dueDate} InputLabelProps={{ shrink: true }} onChange={(e)=>{ const arr = [...bigDeliverables]; arr[idx].dueDate = e.target.value; setBigDeliverables(arr); }} />
                  <TextField placeholder="Amount" size="small" type="number" value={d.amount} onChange={(e)=>{ const arr = [...bigDeliverables]; arr[idx].amount = e.target.value; setBigDeliverables(arr); }} sx={{ width: 120 }} />
                  <IconButton onClick={()=>{ const arr = bigDeliverables.filter((_,i)=>i!==idx); setBigDeliverables(arr.length?arr:[{ description: '', dueDate: '', amount: 0 }]); }}><RemoveCircleOutlineIcon /></IconButton>
                </Box>
              ))}
              <Box sx={{ mt: 1 }}>
                <IconButton onClick={()=>setBigDeliverables((s)=>[...s, { description: '', dueDate: '', amount: 0 }])}><AddCircleOutlineIcon /></IconButton>
                <Typography component="span" sx={{ ml: 1 }}>Add deliverable</Typography>
              </Box>
            </Box>
          )}
        </Grid>
        <Grid item xs={12} md={5}>
          <PriceSummary price={price} onPay={handlePay} />
        </Grid>
      </Grid>
    </Container>
  );
}
