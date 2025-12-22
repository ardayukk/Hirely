import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Avatar,
  Divider,
  CircularProgress,
  IconButton,
  Chip,
  Menu,
  MenuItem,
  Alert
} from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ChatComposer from '../components/ChatComposer';
import { useSocket } from '../context/SocketProvider';
import axios from 'axios';

const API_BASE = 'http://127.0.0.1:8000/api';

export default function ChatWindow({ orderId, currentUserId, otherUser }) {
  const {
    connect,
    disconnect,
    sendMessage: sendSocketMessage,
    messages: socketMessages,
    connectionStatus,
    isConnected
  } = useSocket();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load existing messages and connect WebSocket
  useEffect(() => {
    if (!orderId || !currentUserId) return;

    // Connect WebSocket
    connect(orderId);

    // Fetch existing messages
    const fetchMessages = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_BASE}/messages`, {
          params: { order_id: orderId, user_id: currentUserId }
        });
        setMessages(response.data || []);
        setError(null);
      } catch (err) {
        console.error('Failed to load messages:', err);
        setError(err.response?.data?.detail || 'Failed to load messages');
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    // Cleanup
    return () => {
      disconnect(orderId);
    };
  }, [orderId, currentUserId, connect, disconnect]);

  // Merge WebSocket messages with existing messages
  useEffect(() => {
    const newMessages = socketMessages[orderId] || [];
    if (newMessages.length > 0) {
      setMessages(prev => {
        const existingIds = new Set(prev.map(m => m.message_id));
        const uniqueNew = newMessages.filter(m => !existingIds.has(m.message_id));
        return [...prev, ...uniqueNew];
      });
    }
  }, [socketMessages, orderId]);

  // Handle send message
  const handleSend = async ({ text }) => {
    if (!text.trim() || !isConnected(orderId)) {
      // Fallback to REST if WebSocket not connected
      try {
        const response = await axios.post(`${API_BASE}/messages`, {
          order_id: orderId,
          message_text: text,
          reply_to_id: null
        }, {
          params: { sender_id: currentUserId }
        });
        
        // Add to messages immediately
        setMessages(prev => [...prev, response.data]);
      } catch (err) {
        console.error('Failed to send message:', err);
        setError('Failed to send message');
      }
      return;
    }

    // Send via WebSocket
    sendSocketMessage(orderId, text);
  };

  // Handle file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('order_id', orderId);
      formData.append('user_id', currentUserId);

      const uploadResponse = await axios.post(`${API_BASE}/messages/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Send message with file attachment
      await axios.post(`${API_BASE}/messages`, {
        order_id: orderId,
        message_text: `Sent a file: ${uploadResponse.data.file_name}`,
        reply_to_id: null,
        file_name: uploadResponse.data.file_name,
        file_path: uploadResponse.data.file_path,
        file_type: uploadResponse.data.file_type
      }, {
        params: { sender_id: currentUserId }
      });

      // Reload messages
      const response = await axios.get(`${API_BASE}/messages`, {
        params: { order_id: orderId, user_id: currentUserId }
      });
      setMessages(response.data || []);
      
    } catch (err) {
      console.error('File upload failed:', err);
      setError(err.response?.data?.detail || 'File upload failed');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const status = connectionStatus[orderId];
  const statusColor = {
    connected: 'success',
    connecting: 'warning',
    disconnected: 'default',
    error: 'error'
  }[status] || 'default';

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper elevation={3} sx={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar>{otherUser?.name?.[0] || 'U'}</Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6">{otherUser?.name || 'User'}</Typography>
          <Chip 
            label={status || 'disconnected'} 
            size="small" 
            color={statusColor}
            sx={{ height: '20px', fontSize: '0.7rem' }}
          />
        </Box>
        <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)}>
          <MoreVertIcon />
        </IconButton>
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={() => setMenuAnchor(null)}
        >
          <MenuItem onClick={() => { connect(orderId); setMenuAnchor(null); }}>
            Reconnect
          </MenuItem>
          <MenuItem onClick={() => { disconnect(orderId); setMenuAnchor(null); }}>
            Disconnect
          </MenuItem>
        </Menu>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ m: 2 }}>
          {error}
        </Alert>
      )}

      {/* Messages */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {messages.length === 0 && (
          <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mt: 4 }}>
            No messages yet. Start the conversation!
          </Typography>
        )}
        
        {messages.map((msg) => {
          const isMe = msg.sender_id === currentUserId;
          return (
            <Box
              key={msg.message_id}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isMe ? 'flex-end' : 'flex-start',
                mb: 1
              }}
            >
              <Paper
                sx={{
                  p: 1.5,
                  maxWidth: '70%',
                  bgcolor: isMe ? 'primary.main' : 'grey.100',
                  color: isMe ? 'primary.contrastText' : 'text.primary'
                }}
              >
                {msg.sender_name && !isMe && (
                  <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5 }}>
                    {msg.sender_name}
                  </Typography>
                )}
                <Typography variant="body2">{msg.message_text}</Typography>
                
                {/* File attachment */}
                {msg.file_name && (
                  <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <AttachFileIcon fontSize="small" />
                    <Typography variant="caption">{msg.file_name}</Typography>
                  </Box>
                )}
                
                <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.7 }}>
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </Typography>
              </Paper>
            </Box>
          );
        })}
        <div ref={messagesEndRef} />
      </Box>

      <Divider />

      {/* Input */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <input
          ref={fileInputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />
        <IconButton
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingFile}
        >
          {uploadingFile ? <CircularProgress size={24} /> : <AttachFileIcon />}
        </IconButton>
        
        <Box sx={{ flex: 1 }}>
          <ChatComposer
            onSend={handleSend}
            disabled={!isConnected(orderId) && status !== 'connected'}
          />
        </Box>
      </Box>
    </Paper>
  );
}
