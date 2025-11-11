import React from 'react';
import { Card, CardContent, Typography, Box, Button, Avatar } from '@mui/material';

export default function OrderCard({ order, onView, onMessage }) {
  return (
    <Card sx={{ mb: 2 }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar>{order.seller.name?.[0] || 'S'}</Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6">{order.title}</Typography>
          <Typography variant="body2" color="text.secondary">{order.seller.name} · {order.tier.name} · {order.price.total} {order.price.currency}</Typography>
        </Box>
        <Box>
          <Button size="small" onClick={() => onMessage && onMessage(order)}>Message</Button>
          <Button variant="contained" size="small" onClick={() => onView && onView(order)} sx={{ ml: 1 }}>View</Button>
        </Box>
      </CardContent>
    </Card>
  );
}
