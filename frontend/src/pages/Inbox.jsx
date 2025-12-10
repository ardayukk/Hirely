import React, { useEffect, useState } from 'react';
import { Container, Typography, List, ListItemButton, ListItemText, Badge, Divider } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { axiosInstance, useAuth } from '../context/Authcontext';

export default function Inbox(){
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const nav = useNavigate();

  useEffect(() => {
    if (user?.id) {
      loadThreads();
    }
  }, [user]);

  const loadThreads = async () => {
    try {
      const res = await axiosInstance.get(`/api/messages/threads?user_id=${user.id}`);
      setConversations(res.data || []);
    } catch (err) {
      console.error('Failed to load inbox', err);
    }
  };

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>Inbox</Typography>
      <List>
        {conversations.length === 0 && (
          <Typography color="text.secondary" sx={{ p: 2 }}>No conversations yet.</Typography>
        )}
        {conversations.map(c => (
          <React.Fragment key={`${c.client_id}-${c.freelancer_id}`}>
            <ListItemButton onClick={() => c.order_id && nav(`/orders/${c.order_id}#chat`)} disabled={!c.order_id}>
              <ListItemText
                primary={c.other_user_name || `User ${c.other_user_id}`}
                secondary={c.last_message || 'No messages yet'}
              />
              <Badge color="warning" badgeContent={c.unread_count || 0} />
            </ListItemButton>
            <Divider />
          </React.Fragment>
        ))}
      </List>
    </Container>
  );
}
