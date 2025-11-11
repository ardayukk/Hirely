import React from 'react';
import { Box, Card, CardContent, Typography, Radio, FormControlLabel } from '@mui/material';

export default function CheckoutTiers({ tiers = [], value, onChange }) {
  return (
    <Box>
      {tiers.map((t) => (
        <Card key={t.id} sx={{ mb: 2 }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h6">{t.name}</Typography>
              <Typography variant="body2" color="text.secondary">{t.deliveryDays} days · {t.price} USD</Typography>
            </Box>
            <FormControlLabel
              control={<Radio checked={value === t.id} onChange={() => onChange && onChange(t.id)} />}
              label=""
            />
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}
