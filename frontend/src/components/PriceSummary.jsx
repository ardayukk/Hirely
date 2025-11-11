import React from 'react';
import { Box, Paper, Typography, Divider, Button } from '@mui/material';

export default function PriceSummary({ price = {}, onPay }) {
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6">Price summary</Typography>
      <Box sx={{ mt: 1 }}>
        <Typography variant="body2">Subtotal: {price.subtotal ?? '-'} {price.currency}</Typography>
        <Typography variant="body2">Fees: {price.fees ?? '-'} {price.currency}</Typography>
        <Divider sx={{ my: 1 }} />
        <Typography variant="h6">Total: {price.total ?? '-'} {price.currency}</Typography>
      </Box>
      <Button fullWidth variant="contained" sx={{ mt: 2 }} onClick={onPay}>Pay</Button>
    </Paper>
  );
}
