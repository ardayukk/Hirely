import { Box, Container, Tab, Tabs, Typography } from '@mui/material';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import CategoryTrends from '../components/CategoryTrends';
import { useAuth } from '../context/Authcontext';
import AdminDisputes from './AdminDisputes';
import TopFreelancersAnalytics from './TopFreelancersAnalytics';
import SatisfactionDashboard from './SatisfactionDashboard';
import PricingAnalytics from './PricingAnalytics';

export default function Admin() {
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState(0);

    useEffect(() => {
        const tabParam = searchParams.get('tab');
        if (tabParam === 'pricing') setActiveTab(4);
        else if (tabParam === 'trends') setActiveTab(3);
        else if (tabParam === 'satisfaction') setActiveTab(2);
        else if (tabParam === 'freelancers') setActiveTab(1);
        else if (tabParam === 'disputes') setActiveTab(0);
    }, [searchParams]);

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
        let tabName = 'disputes';
        if (newValue === 1) tabName = 'freelancers';
        if (newValue === 2) tabName = 'satisfaction';
        if (newValue === 3) tabName = 'trends';
        if (newValue === 4) tabName = 'pricing';
        setSearchParams({ tab: tabName });
    };

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

            <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
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
