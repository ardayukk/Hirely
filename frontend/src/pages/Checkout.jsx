import React, { useState } from 'react';
import { Container, Grid, Box, Typography } from '@mui/material';
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

  const handlePay = async () => {
    const order = await createOrder({ title: requirements.short || 'New project', tier: demoTiers.find(t=>t.id===tier), price, deadline: null });
    // navigate to order detail in a full app; here we just console.log
    console.log('order created', order);
    alert('Order created (mock): ' + order.id);
  };

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>Checkout</Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <CheckoutTiers tiers={demoTiers} value={tier} onChange={setTier} />
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6">Requirements</Typography>
            <RequirementsEditor value={requirements} onChange={setRequirements} onAttach={() => alert('Attach not implemented in mock')} />
          </Box>
        </Grid>
        <Grid item xs={12} md={5}>
          <PriceSummary price={price} onPay={handlePay} />
        </Grid>
      </Grid>
    </Container>
  );
}
