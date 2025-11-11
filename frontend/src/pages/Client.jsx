import React, { useState } from 'react';
import { AppBar, Tabs, Tab, Container, Box, Typography, Avatar, Stack } from '@mui/material';
import Checkout from './Checkout';
import Orders from './Orders';
import Inbox from './Inbox';

export default function ClientWorkspace() {
  const [tab, setTab] = useState(0);

  return (
    <>
      <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <Container sx={{ py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="h6" fontWeight={700}>Client Workspace</Typography>
            <Typography variant="body2" color="text.secondary">Manage your orders and messages</Typography>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            <Avatar alt="You" />
            <Typography variant="body2" color="text.secondary">Client</Typography>
          </Stack>
        </Container>
        <Container>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mt: 1 }}>
            <Tab label="Dashboard" />
            <Tab label="Checkout" />
            <Tab label="My Orders" />
            <Tab label="Inbox" />
            <Tab label="Payments" />
            <Tab label="Settings" />
          </Tabs>
        </Container>
      </AppBar>

      <Container sx={{ py: 3 }}>
        {tab === 0 && (
          <Box>
            <Typography variant="h5">Welcome to your client dashboard</Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>Quick links: Checkout, My Orders, Inbox.</Typography>
          </Box>
        )}
        {tab === 1 && <Checkout />}
        {tab === 2 && <Orders />}
        {tab === 3 && <Inbox />}
        {tab === 4 && (
          <Box>
            <Typography variant="h6">Payments</Typography>
            <Typography color="text.secondary">(Mock) View charges and invoices here.</Typography>
          </Box>
        )}
        {tab === 5 && (
          <Box>
            <Typography variant="h6">Settings</Typography>
            <Typography color="text.secondary">Update profile and notification preferences.</Typography>
          </Box>
        )}
      </Container>
    </>
  );
}
