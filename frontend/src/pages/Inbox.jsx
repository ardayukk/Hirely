import React, { useEffect, useState } from 'react';
import { Container, Typography, List, ListItemButton, ListItemText, Badge } from '@mui/material';
import { useMockApi } from '../context/MockApiProvider';
import { useNavigate } from 'react-router-dom';

export default function Inbox(){
  const { listConversations } = useMockApi();
  const [conversations, setConversations] = useState([]);
  const nav = useNavigate();

  useEffect(()=>{ listConversations().then(setConversations); }, []);

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h4">Inbox</Typography>
      <List>
        {conversations.map(c => (
          <ListItemButton key={c.id} onClick={() => nav(`/orders/${c.orderId}`)}>
            <ListItemText primary={c.partner.name} secondary={c.lastMessage} />
            <Badge color="warning" badgeContent={c.unread || 0} />
          </ListItemButton>
        ))}
      </List>
    </Container>
  );
}
