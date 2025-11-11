import React, { useEffect, useState } from 'react';
import { Container, Typography, Table, TableBody, TableCell, TableHead, TableRow, Button } from '@mui/material';
import { useMockApi } from '../context/MockApiProvider';

export default function Payments(){
  const { listPayments } = useMockApi();
  const [payments, setPayments] = useState([]);

  useEffect(()=>{ listPayments().then(setPayments); }, []);

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>Payments</Typography>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Date</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Amount</TableCell>
            <TableCell>Order</TableCell>
            <TableCell>Status</TableCell>
            <TableCell></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {payments.map(p => (
            <TableRow key={p.id}>
              <TableCell>{new Date(p.date).toLocaleString()}</TableCell>
              <TableCell>{p.type}</TableCell>
              <TableCell>{p.amount} {p.currency}</TableCell>
              <TableCell>{p.orderId || '—'}</TableCell>
              <TableCell>{p.status}</TableCell>
              <TableCell><Button size="small">Invoice</Button></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Container>
  );
}
