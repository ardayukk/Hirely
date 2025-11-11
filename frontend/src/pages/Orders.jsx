import React, { useEffect, useState } from 'react';
import { Container, Typography, Box } from '@mui/material';
import OrderCard from '../components/OrderCard';
import { useMockApi } from '../context/MockApiProvider';
import { useNavigate } from 'react-router-dom';

export default function Orders() {
  const { listOrders } = useMockApi();
  const [orders, setOrders] = useState([]);
  const nav = useNavigate();

  useEffect(() => {
    listOrders().then(setOrders);
  }, []);

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>My Orders</Typography>
      <Box>
        {orders.map((o) => (
          <OrderCard key={o.id} order={o} onView={(order)=>nav(`/orders/${order.id}`)} onMessage={(order)=>nav(`/inbox/${order.id}`)} />
        ))}
      </Box>
    </Container>
  );
}
