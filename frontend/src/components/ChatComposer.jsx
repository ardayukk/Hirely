import React, { useState } from 'react';
import { Box, TextField, IconButton } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';

export default function ChatComposer({ onSend }) {
  const [text, setText] = useState('');
  const submit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend && onSend({ text, createdAt: new Date().toISOString() });
    setText('');
  };
  return (
    <Box component="form" onSubmit={submit} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
      <TextField fullWidth value={text} onChange={(e)=>setText(e.target.value)} placeholder="Write a message..." />
      <IconButton type="submit"><SendIcon /></IconButton>
    </Box>
  );
}
