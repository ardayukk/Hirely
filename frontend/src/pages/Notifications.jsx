import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Button,
  Stack,
  Chip,
  Alert,
  Box,
  Card,
  CardContent,
  useTheme,
  CircularProgress,
  IconButton,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  MarkEmailRead as MarkReadIcon,
  Notifications as NotificationsIcon,
} from '@mui/icons-material';
import { axiosInstance, useAuth } from '../context/Authcontext';

export default function Notifications() {
  const { user } = useAuth();
  const theme = useTheme();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.id) {
      loadNotifications();
    }
  }, [user]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await axiosInstance.get(`/api/notifications?user_id=${user.id}`);
      setNotifications(res.data || []);
    } catch (err) {
      console.error('Failed to load notifications', err);
      setError(err.response?.data?.detail || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (notificationId) => {
    try {
      await axiosInstance.patch(`/api/notifications/${notificationId}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.notification_id === notificationId ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark as read', err);
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      await axiosInstance.delete(`/api/notifications/${notificationId}`);
      setNotifications((prev) => prev.filter((n) => n.notification_id !== notificationId));
    } catch (err) {
      console.error('Failed to delete', err);
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'order_update':
        return 'primary';
      case 'dispute':
        return 'error';
      case 'message':
        return 'info';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const sortedNotifications = [...notifications].sort((a, b) => {
    if (a.is_read !== b.is_read) return a.is_read ? 1 : -1;
    return new Date(b.date_sent) - new Date(a.date_sent);
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
          <Box sx={{ textAlign: 'center' }}>
            <Stack
              direction="row"
              spacing={2}
              sx={{
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2,
              }}
            >
              <NotificationsIcon sx={{ fontSize: 40, color: theme.palette.primary.main }} />
              <Typography
                variant="h3"
                sx={{
                  fontWeight: '800',
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Notifications
              </Typography>
            </Stack>
            <Typography variant="h6" color="text.secondary">
              {unreadCount > 0 && (
                <Chip
                  label={`${unreadCount} unread`}
                  color="primary"
                  size="small"
                  sx={{ mr: 1 }}
                />
              )}
              {notifications.length} {notifications.length === 1 ? 'notification' : 'notifications'}
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          {notifications.length === 0 ? (
            <Card sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
              <NotificationsIcon
                sx={{
                  fontSize: 64,
                  color: theme.palette.action.disabled,
                  mb: 2,
                }}
              />
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                No notifications yet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                We'll notify you about important updates on your orders, messages, and more.
              </Typography>
            </Card>
          ) : (
            <List sx={{ '& .MuiListItem-root': { mb: 2 } }}>
              {sortedNotifications.map((notif) => (
                <ListItem
                  key={notif.notification_id}
                  disablePadding
                  sx={{
                    borderRadius: 2,
                    background: notif.is_read ? 'transparent' : theme.palette.action.hover,
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Card
                    sx={{
                      width: '100%',
                      borderRadius: 2,
                      boxShadow: theme.shadows[4],
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      border: !notif.is_read ? `2px solid ${theme.palette.primary.main}` : 'none',
                      '&:hover': {
                        boxShadow: theme.shadows[8],
                        transform: 'translateY(-2px)',
                      },
                    }}
                  >
                    <CardContent
                      sx={{
                        p: 2,
                        display: 'flex',
                        gap: 2,
                        alignItems: 'flex-start',
                      }}
                    >
                      <Box sx={{ flex: 1 }}>
                        <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap' }}>
                          <Chip
                            label={notif.type?.replace('_', ' ').toUpperCase() || 'Update'}
                            color={getTypeColor(notif.type)}
                            size="small"
                            sx={{ fontWeight: 600 }}
                          />
                          {!notif.is_read && (
                            <Chip
                              label="Unread"
                              size="small"
                              sx={{
                                backgroundColor: theme.palette.warning.main,
                                color: theme.palette.common.white,
                                fontWeight: 600,
                              }}
                            />
                          )}
                        </Stack>
                        <Typography
                          variant="body1"
                          sx={{
                            fontWeight: notif.is_read ? 'normal' : '700',
                            mb: 0.5,
                          }}
                        >
                          {notif.message}
                        </Typography>
                        {notif.date_sent && (
                          <Typography variant="caption" color="text.secondary">
                            {new Date(notif.date_sent).toLocaleString()}
                          </Typography>
                        )}
                      </Box>

                      <Stack direction="row" spacing={1}>
                        {!notif.is_read && (
                          <IconButton
                            size="small"
                            onClick={() => handleMarkRead(notif.notification_id)}
                            title="Mark as read"
                            sx={{
                              color: theme.palette.primary.main,
                              '&:hover': {
                                backgroundColor: theme.palette.primary.light,
                              },
                            }}
                          >
                            <MarkReadIcon fontSize="small" />
                          </IconButton>
                        )}
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(notif.notification_id)}
                          title="Delete"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </CardContent>
                  </Card>
                </ListItem>
              ))}
            </List>
          )}
        </Stack>
      </Container>
    </Box>
  );
}
