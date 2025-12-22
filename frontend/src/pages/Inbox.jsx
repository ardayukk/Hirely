import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Badge,
  Divider,
  Paper,
  Chip,
  Stack,
  useTheme,
  CircularProgress,
  Avatar,
} from '@mui/material';
import { ChatBubble as MessageIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { axiosInstance, useAuth } from '../context/Authcontext';

export default function Inbox() {
  const { user } = useAuth();
  const theme = useTheme();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();

  useEffect(() => {
    if (user?.id) {
      loadThreads();
    }
  }, [user]);

  const loadThreads = async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get(`/api/messages/threads?user_id=${user.id}`);
      setConversations(res.data || []);
    } catch (err) {
      console.error('Failed to load inbox', err);
    } finally {
      setLoading(false);
    }
  };

  const sortedConversations = [...conversations].sort((a, b) => {
    const aTime = new Date(a.last_message_time || 0).getTime();
    const bTime = new Date(b.last_message_time || 0).getTime();
    return bTime - aTime;
  });

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${theme.palette.background.default} 0%, ${theme.palette.mode === 'dark' ? '#1a1a2e' : '#f5f5f5'} 100%)`,
        py: 4,
      }}
    >
      <Container maxWidth="md">
        <Stack spacing={3}>
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Typography
              variant="h3"
              sx={{
                fontWeight: '800',
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 1,
              }}
            >
              Inbox
            </Typography>
            <Typography variant="h6" color="text.secondary">
              {conversations.length} {conversations.length === 1 ? 'conversation' : 'conversations'}
            </Typography>
          </Box>

          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          )}

          {!loading && conversations.length === 0 && (
            <Paper
              sx={{
                p: 4,
                textAlign: 'center',
                borderRadius: 2,
                backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[900] : theme.palette.grey[50],
              }}
            >
              <MessageIcon style={{ fontSize: 48, opacity: 0.5, marginBottom: 16 }} />
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                No conversations yet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Start a conversation by hiring a freelancer or messaging about a service.
              </Typography>
            </Paper>
          )}

          {!loading && conversations.length > 0 && (
            <List
              sx={{
                background: 'transparent',
                '& .MuiDivider-root': { display: 'none' },
              }}
            >
              {sortedConversations.map((conv, idx) => (
                <ListItem
                  key={`${conv.client_id}-${conv.freelancer_id}`}
                  disablePadding
                  sx={{ mb: 2 }}
                >
                  <ListItemButton
                    onClick={() => conv.order_id && nav(`/orders/${conv.order_id}#chat`)}
                    disabled={!conv.order_id}
                    sx={{
                      borderRadius: 2,
                      background: theme.palette.background.paper,
                      boxShadow: theme.shadows[4],
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      width: '100%',
                      p: 2,
                      '&:hover': {
                        transform: 'translateX(4px)',
                        boxShadow: theme.shadows[8],
                      },
                      '&.Mui-disabled': {
                        opacity: 0.6,
                      },
                      display: 'flex',
                      gap: 2,
                    }}
                  >
                    <Avatar
                      sx={{
                        bgcolor: theme.palette.primary.main,
                        width: 48,
                        height: 48,
                        flexShrink: 0,
                      }}
                    >
                      {conv.other_user_name?.[0]?.toUpperCase() || '?'}
                    </Avatar>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 600,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {conv.other_user_name || `User ${conv.other_user_id}`}
                        </Typography>
                        {conv.unread_count > 0 && (
                          <Chip
                            label={conv.unread_count}
                            size="small"
                            color="primary"
                            sx={{
                              height: 24,
                              fontWeight: 700,
                            }}
                          />
                        )}
                      </Stack>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {conv.last_message || 'No messages yet'}
                      </Typography>

                      {conv.last_message_time && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ mt: 0.5, display: 'block' }}
                        >
                          {new Date(conv.last_message_time).toLocaleDateString()}
                        </Typography>
                      )}
                    </Box>
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </Stack>
      </Container>
    </Box>
  );
}
