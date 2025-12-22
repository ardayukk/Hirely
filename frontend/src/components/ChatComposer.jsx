import React, { useMemo, useState } from 'react';
import { Box, TextField, IconButton, Tooltip, Button, Typography } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';

export default function ChatComposer({ onSend, disabled = false }) {
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  // Unique input id so clicking the label triggers the hidden input reliably
  const inputId = useMemo(() => `chat-file-input-${crypto.randomUUID()}`, []);

  const submit = (e) => {
    e.preventDefault();
    if (disabled) return;
    // Allow sending messages with just a file, just text, or both
    if (!text.trim() && !file) return;
    onSend && onSend({ text, file, createdAt: new Date().toISOString() });
    setText('');
    setFile(null);
    // Clear input element value if needed
    if (e.target && e.target.reset) {
      e.target.reset();
    }
  };

  return (
    <Box component="form" onSubmit={submit} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <TextField fullWidth value={text} onChange={(e)=>setText(e.target.value)} placeholder="Write a message..." disabled={disabled} />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          disabled={disabled}
          style={{ display: 'none' }}
          id={inputId}
        />
        <Tooltip title={file ? `Attached: ${file.name}` : 'Attach a file'}>
          <span>
            <Button
              component="label"
              htmlFor={inputId}
              variant="outlined"
              size="small"
              startIcon={<AttachFileIcon />}
              disabled={disabled}
            >
              {file ? 'Change file' : 'Attach file'}
            </Button>
          </span>
        </Tooltip>
        {file && (
          <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }}>
            {file.name}
          </Typography>
        )}
        <IconButton type="submit" disabled={disabled}><SendIcon /></IconButton>
      </Box>
    </Box>
  );
}
