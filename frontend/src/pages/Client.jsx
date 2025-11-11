import React, { useState, useEffect } from 'react';
import { AppBar, Tabs, Tab, Container, Box, Typography, Avatar, Stack, Badge, Chip } from '@mui/material';
import Checkout from './Checkout';
import Orders from './Orders';
import Inbox from './Inbox';
import Payments from './Payments';
import { useMockApi } from '../context/MockApiProvider';

export default function ClientWorkspace() {
  const [tab, setTab] = useState(0);
  const [stats, setStats] = useState({ activeOrders: 0, unreadMessages: 0, pendingPayments: 0 });
  const { getDashboardStats, getProfile } = useMockApi();

  useEffect(() => {
    getDashboardStats().then(s => setStats(s));
    getProfile().then(p => {/* could show profile */});
  }, []);

  return (
    <>
      <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <Container sx={{ py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="h6" fontWeight={700}>Client Workspace</Typography>
            <Typography variant="body2" color="text.secondary">Manage your orders and messages</Typography>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            <Chip label={`Orders: ${stats.activeOrders}`} size="small" />
            <Chip label={`Unread: ${stats.unreadMessages}`} size="small" color={stats.unreadMessages ? 'warning' : 'default'} />
            <Avatar alt="You" />
            <Typography variant="body2" color="text.secondary">Client</Typography>
          </Stack>
        </Container>
        <Container>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mt: 1 }}>
            <Tab label="Dashboard" />
            <Tab label="Checkout" />
            <Tab label={`My Orders (${stats.activeOrders})`} />
            <Tab label={<Badge color="warning" badgeContent={stats.unreadMessages}>Inbox</Badge>} />
            <Tab label={`Payments (${stats.pendingPayments})`} />
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
        {tab === 4 && <Payments />}
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
