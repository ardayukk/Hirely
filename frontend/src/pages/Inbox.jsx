import React, { useEffect, useState } from 'react';
import { Container, Typography, List, ListItemButton, ListItemText } from '@mui/material';
import { useMockApi } from '../context/MockApiProvider';
import { useNavigate, useParams } from 'react-router-dom';

export default function Inbox(){
  const { listOrders, listMessages } = useMockApi();
  const [orders, setOrders] = useState([]);
  const nav = useNavigate();

  useEffect(()=>{ listOrders().then(setOrders); }, []);

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h4">Inbox</Typography>
      <List>
        {orders.map(o => (
          <ListItemButton key={o.id} onClick={() => nav(`/inbox/${o.id}`)}>
            <ListItemText primary={o.title} secondary={`${o.seller.name} · ${o.status}`} />
          </ListItemButton>
        ))}
      </List>
    </Container>
  );
}
