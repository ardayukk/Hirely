import React, { useEffect, useState } from 'react';
import { Container, Typography, List, ListItemButton, ListItemText, Badge, Divider, Grid, Paper, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { axiosInstance, useAuth } from '../context/Authcontext';
import ChatWindow from '../components/ChatWindow';
import { SocketProvider } from '../context/SocketProvider';

export default function Inbox(){
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
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
    <SocketProvider userId={user?.id}>
      <Container maxWidth="xl" sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom>Inbox</Typography>
        
        <Grid container spacing={3}>
          {/* Conversation List */}
          <Grid item xs={12} md={4}>
            <Paper elevation={2}>
              <List>
                {conversations.length === 0 && (
                  <Typography color="text.secondary" sx={{ p: 2 }}>No conversations yet.</Typography>
                )}
                {conversations.map(c => (
                  <React.Fragment key={`${c.client_id}-${c.freelancer_id}`}>
                    <ListItemButton 
                      onClick={() => setSelectedConversation(c)}
                      selected={selectedConversation?.order_id === c.order_id}
                      disabled={!c.order_id}
                    >
                      <ListItemText
                        primary={c.other_user_name || `User ${c.other_user_id}`}
                        secondary={c.last_message || 'No messages yet'}
                      />
                      {c.unread_count > 0 && (
                        <Badge color="error" badgeContent={c.unread_count} />
                      )}
                    </ListItemButton>
                    <Divider />
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          </Grid>

          {/* Chat Window */}
          <Grid item xs={12} md={8}>
            {selectedConversation ? (
              <ChatWindow
                orderId={selectedConversation.order_id}
                currentUserId={user?.id}
                otherUser={{
                  id: selectedConversation.other_user_id,
                  name: selectedConversation.other_user_name
                }}
              />
            ) : (
              <Paper sx={{ height: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography color="text.secondary">
                  Select a conversation to start messaging
                </Typography>
              </Paper>
            )}
          </Grid>
        </Grid>
      </Container>
    </SocketProvider>
  );
}
