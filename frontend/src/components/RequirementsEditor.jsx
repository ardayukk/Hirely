import React from 'react';
import { TextField, Box, Typography } from '@mui/material';

export default function RequirementsEditor({ value, onChange }) {
  const handleChange = (field) => (e) => {
    onChange({ ...value, [field]: e.target.value });
  };

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Typography variant="h6">Project Requirements</Typography>
      <TextField
        label="Project Description"
        placeholder="Describe your project in detail..."
        value={value.description || ''}
        onChange={handleChange('description')}
        fullWidth
        multiline
        rows={4}
      />
      <TextField
        label="Specific Deliverables"
        placeholder="What exactly do you need delivered?"
        value={value.deliverables || ''}
        onChange={handleChange('deliverables')}
        fullWidth
        multiline
        rows={2}
      />
      <TextField
        label="Preferred Style or Approach"
        placeholder="e.g., Minimalist, Professional, Casual..."
        value={value.style || ''}
        onChange={handleChange('style')}
        fullWidth
      />
      <TextField
        label="Reference Materials"
        placeholder="Links to examples or inspiration..."
        value={value.references || ''}
        onChange={handleChange('references')}
        fullWidth
        multiline
        rows={2}
      />
      <TextField
        label="Constraints or Deadlines"
        placeholder="Any specific constraints or hard deadlines?"
        value={value.constraints || ''}
        onChange={handleChange('constraints')}
        fullWidth
      />
    </Box>
  );
}
