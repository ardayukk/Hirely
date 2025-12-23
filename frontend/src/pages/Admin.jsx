import { Box, Container, Tab, Tabs, Typography } from '@mui/material';
import { useState } from 'react';
import CategoryTrends from '../components/CategoryTrends';
import { useAuth } from '../context/Authcontext';
import AdminDisputes from './AdminDisputes';
import TopFreelancersAnalytics from './TopFreelancersAnalytics';
import SatisfactionDashboard from './SatisfactionDashboard';
import PricingAnalytics from './PricingAnalytics';

export default function Admin() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState(0);

    if (user?.role !== 'admin') {
        return (
            <Container sx={{ py: 4 }}>
                <Typography color="error">Access Denied: Admin only</Typography>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" gutterBottom>
                    Admin Panel
                </Typography>
                <Typography variant="body2" color="textSecondary">
                    Platform management and analytics
                </Typography>
            </Box>

            <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
                <Tab label="Disputes" />
                <Tab label="Top Freelancers" />
                <Tab label="Satisfaction Metrics" />
                <Tab label="Category Trends" />
                <Tab label="Pricing Trends" />
            </Tabs>

            <Box sx={{ mt: 2 }}>
                {activeTab === 0 && <AdminDisputes />}
                {activeTab === 1 && <TopFreelancersAnalytics />}
                {activeTab === 2 && <SatisfactionDashboard />}
                {activeTab === 3 && <CategoryTrends />}
                {activeTab === 4 && <PricingAnalytics />}
            </Box>
        </Container>
    );
}
