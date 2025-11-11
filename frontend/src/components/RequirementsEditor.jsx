import React from 'react';
import { TextField, Box, Button } from '@mui/material';

export default function RequirementsEditor({ value, onChange, onAttach }) {
  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <TextField label="Short description" value={value.short || ''} onChange={(e)=>onChange({...value, short: e.target.value})} fullWidth />
      <TextField label="Detailed requirements" value={value.detail || ''} onChange={(e)=>onChange({...value, detail: e.target.value})} fullWidth multiline rows={6} />
      <Button variant="outlined" onClick={() => onAttach && onAttach()}>Attach files</Button>
    </Box>
  );
}
