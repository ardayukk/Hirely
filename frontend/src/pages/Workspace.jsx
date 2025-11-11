import React, { useEffect } from 'react';
import { Container, Tabs, Tab, Box, Typography } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Workspace() {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine active tab based on path
  const tabIndex = location.pathname.startsWith('/seller') ? 0 : location.pathname.startsWith('/client') ? 1 : 0;

  useEffect(() => {
    // If at /workspace, default to seller
    if (location.pathname === '/workspace') navigate('/seller', { replace: true });
  }, [location.pathname]);

  const handleTab = (_, v) => {
    if (v === 0) navigate('/seller');
    if (v === 1) navigate('/client');
  };

  return (
    <Container sx={{ mt: 2 }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabIndex} onChange={handleTab} aria-label="workspace tabs">
          <Tab label="Seller Workspace" />
          <Tab label="Client Workspace" />
        </Tabs>
      </Box>
      <Box sx={{ mt: 3 }}>
        <Typography variant="body2" color="text.secondary">Choose a workspace tab to open the corresponding dashboard. This page only provides a single-entry point to both Seller and Client pages.</Typography>
      </Box>
    </Container>
  );
}
