import React from 'react';
import { Card, CardContent, Typography, Box, Button, Avatar, Chip } from '@mui/material';

export default function OrderCard({ order, onView, onMessage }) {
  return (
    <Card sx={{ mb: 2 }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar>{order.seller.name?.[0] || 'S'}</Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6">{order.title}</Typography>
          <Typography variant="body2" color="text.secondary">
            {order.seller.name} · {order.tier?.name}
            {order.orderType === 'big' ? (
              <span> · {order.deliverables ? order.deliverables.length : 0} deliverables · {order.price?.total} {order.price?.currency}</span>
            ) : (
              <span> · {order.price?.total} {order.price?.currency}</span>
            )}
          </Typography>
          <Box sx={{ mt: 1 }}>
            <Chip label={order.status} size="small" sx={{ mr: 1 }} />
            {order.orderType && <Chip label={order.orderType === 'big' ? 'Big' : 'Small'} size="small" sx={{ mr: 1 }} />}
            {order.dueDate && <Typography component="span" variant="caption" color="text.secondary">Due {new Date(order.dueDate).toLocaleDateString()}</Typography>}
          </Box>
        </Box>
        <Box>
          <Button size="small" onClick={() => onMessage && onMessage(order)}>Message</Button>
          <Button variant="contained" size="small" onClick={() => onView && onView(order)} sx={{ ml: 1 }}>View</Button>
        </Box>
      </CardContent>
    </Card>
  );
}
