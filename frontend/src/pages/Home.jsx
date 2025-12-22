import React from 'react';
import { Box, Container, Typography, Stack, Button, Card, CardContent, CardHeader, Grid, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { Rocket as RocketIcon, Store as StoreIcon, BarChart as AnalyticsIcon, Code as CodeIcon } from '@mui/icons-material';

export default function Home() {
    const navigate = useNavigate();
    const theme = useTheme();

    const ActionGroup = ({ icon: Icon, title, description, actions }) => (
        <Card
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: theme.shadows[12],
                },
            }}
        >
            <CardHeader
                avatar={<Icon sx={{ fontSize: 40, color: theme.palette.primary.main }} />}
                title={title}
                titleTypographyProps={{ variant: 'h6', fontWeight: 700 }}
            />
            <CardContent sx={{ flex: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {description}
                </Typography>
                <Stack spacing={1}>
                    {actions.map(({ label, to, variant }) => (
                        <Button
                            key={label}
                            variant={variant || 'outlined'}
                            fullWidth
                            onClick={() => navigate(to)}
                            sx={{
                                textTransform: 'none',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                    transform: 'scale(1.02)',
                                },
                            }}
                        >
                            {label}
                        </Button>
                    ))}
                </Stack>
            </CardContent>
        </Card>
    );

    return (
        <Box
            sx={{
                minHeight: '100vh',
                background: `linear-gradient(135deg, ${theme.palette.background.default} 0%, ${theme.palette.mode === 'dark' ? '#1a1a2e' : '#f5f5f5'} 100%)`,
                py: 6,
            }}
        >
            <Container maxWidth="lg">
                <Stack spacing={6}>
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <Typography
                            variant="h3"
                            sx={{
                                fontWeight: 800,
                                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                                backgroundClip: 'text',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                mb: 2,
                            }}
                        >
                            Hirely
                        </Typography>
                        <Typography variant="h5" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
                            Connect with talented freelancers and clients. Build amazing projects together.
                        </Typography>
                    </Box>

                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <ActionGroup
                                icon={StoreIcon}
                                title="Freelancer"
                                description="Showcase your skills, create services, and start earning."
                                actions={[
                                    { label: "Create service", to: "/create-service", variant: "contained" },
                                    { label: "My services", to: "/myServices" },
                                    { label: "Orders", to: "/orders" },
                                    { label: "Inbox", to: "/inbox" },
                                ]}
                            />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <ActionGroup
                                icon={CodeIcon}
                                title="Client"
                                description="Find and hire the perfect freelancer for your project."
                                actions={[
                                    { label: "Browse services", to: "/services", variant: "contained" },
                                    { label: "My orders", to: "/orders" },
                                    { label: "Messages", to: "/inbox" },
                                ]}
                            />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <ActionGroup
                                icon={AnalyticsIcon}
                                title="Admin"
                                description="Manage platform, disputes, users, and analytics."
                                actions={[
                                    { label: "Admin panel", to: "/admin", variant: "contained" },
                                    { label: "Manage users", to: "/admin" },
                                ]}
                            />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <ActionGroup
                                icon={RocketIcon}
                                title="Quick Links"
                                description="Access all platform features and resources."
                                actions={[
                                    { label: "All services", to: "/services" },
                                    { label: "Notifications", to: "/notifications" },
                                    { label: "Profile", to: "/profile" },
                                ]}
                            />
                        </Grid>
                    </Grid>
                </Stack>
            </Container>
        </Box>
    );
}