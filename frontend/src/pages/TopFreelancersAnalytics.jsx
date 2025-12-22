import React, { useState, useEffect } from 'react';
import {
    Container,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Button,
    TextField,
    Box,
    Grid,
    Card,
    CardContent,
    Typography,
    CircularProgress,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
} from '@mui/material';
import { Download, Refresh } from '@mui/icons-material';
import { axiosInstance } from '../context/Authcontext';

export default function TopFreelancersAnalytics() {
    const [freelancers, setFreelancers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [category, setCategory] = useState('');
    const [sortBy, setSortBy] = useState('earnings');
    const [limit, setLimit] = useState(50);
    const [categories, setCategories] = useState([]);
    const [stats, setStats] = useState({
        totalEarnings: 0,
        topEarnings: 0,
        avgRating: 0,
        totalFreelancers: 0,
    });

    useEffect(() => {
        fetchCategories();
        fetchTopFreelancers();
    }, []);

    const fetchCategories = async () => {
        try {
            const res = await axiosInstance.get('/api/services');
            const uniqueCategories = [...new Set(res.data.map((s) => s.category))].sort();
            setCategories(uniqueCategories);
        } catch (err) {
            console.error('Failed to fetch categories', err);
        }
    };

    const fetchTopFreelancers = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);
            if (category) params.append('category', category);
            params.append('sort_by', sortBy);
            params.append('limit', limit);

            const res = await axiosInstance.get(`/api/analytics/top-freelancers?${params.toString()}`);
            setFreelancers(res.data.freelancers || []);

            // Calculate stats
            const totalEarnings = res.data.freelancers.reduce((sum, f) => sum + f.total_earnings, 0);
            const topEarnings = res.data.freelancers.length > 0 ? res.data.freelancers[0].total_earnings : 0;
            const avgRating =
                res.data.freelancers.length > 0
                    ? (res.data.freelancers.reduce((sum, f) => sum + f.avg_rating, 0) / res.data.freelancers.length).toFixed(2)
                    : 0;

            setStats({
                totalEarnings: totalEarnings.toFixed(2),
                topEarnings: topEarnings.toFixed(2),
                avgRating: avgRating,
                totalFreelancers: res.data.freelancers.length,
            });
        } catch (err) {
            console.error('Failed to fetch top freelancers', err);
            alert(err.response?.data?.detail || 'Failed to fetch analytics');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        const headers = [
            'User ID',
            'Username',
            'Email',
            'Wallet Balance',
            'Category',
            'Completed Orders',
            'Total Earnings',
            'Avg Rating',
            'Avg Response Time (hrs)',
            'Completion Rate %',
            'Avg Satisfaction',
        ];

        const csvContent = [
            headers.join(','),
            ...freelancers.map((f) =>
                [
                    f.user_id,
                    f.username,
                    f.email,
                    f.wallet_balance.toFixed(2),
                    f.category,
                    f.completed_orders,
                    f.total_earnings.toFixed(2),
                    f.avg_rating.toFixed(2),
                    f.avg_response_time_hours.toFixed(1),
                    f.completion_rate_percent.toFixed(2),
                    f.avg_satisfaction.toFixed(2),
                ].join(',')
            ),
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `top-freelancers-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const StatCard = ({ label, value, suffix = '' }) => (
        <Card>
            <CardContent>
                <Typography color="textSecondary" gutterBottom>
                    {label}
                </Typography>
                <Typography variant="h5">
                    {value}
                    {suffix}
                </Typography>
            </CardContent>
        </Card>
    );

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" gutterBottom>
                    Top Freelancers Analytics
                </Typography>
                <Typography variant="body2" color="textSecondary">
                    Identify top-performing freelancers by earnings, ratings, and completion rates
                </Typography>
            </Box>

            {/* Stats Cards */}
            <Grid container spacing={2} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard label="Total Earnings" value={`$${stats.totalEarnings}`} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard label="Top Freelancer" value={`$${stats.topEarnings}`} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard label="Avg Rating" value={stats.avgRating} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard label="Freelancers" value={stats.totalFreelancers} />
                </Grid>
            </Grid>

            {/* Filters */}
            <Paper sx={{ p: 3, mb: 3 }}>
                <Grid container spacing={2} alignItems="flex-end">
                    <Grid item xs={12} sm={6} md={2}>
                        <TextField
                            label="Start Date"
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            fullWidth
                            size="small"
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={2}>
                        <TextField
                            label="End Date"
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            fullWidth
                            size="small"
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Category</InputLabel>
                            <Select value={category} label="Category" onChange={(e) => setCategory(e.target.value)}>
                                <MenuItem value="">All</MenuItem>
                                {categories.map((cat) => (
                                    <MenuItem key={cat} value={cat}>
                                        {cat}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6} md={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Sort By</InputLabel>
                            <Select value={sortBy} label="Sort By" onChange={(e) => setSortBy(e.target.value)}>
                                <MenuItem value="earnings">Total Earnings</MenuItem>
                                <MenuItem value="completed_orders">Completed Orders</MenuItem>
                                <MenuItem value="rating">Avg Rating</MenuItem>
                                <MenuItem value="response_time">Response Time</MenuItem>
                                <MenuItem value="completion_rate">Completion Rate</MenuItem>
                                <MenuItem value="satisfaction">Satisfaction</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6} md={2}>
                        <TextField
                            label="Limit"
                            type="number"
                            value={limit}
                            onChange={(e) => setLimit(Number(e.target.value))}
                            fullWidth
                            size="small"
                            inputProps={{ min: 1, max: 500 }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={2} sx={{ display: 'flex', gap: 1 }}>
                        <Button
                            onClick={fetchTopFreelancers}
                            variant="contained"
                            startIcon={<Refresh />}
                            fullWidth
                            disabled={loading}
                        >
                            {loading ? 'Loading...' : 'Refresh'}
                        </Button>
                    </Grid>
                </Grid>
            </Paper>

            {/* Export Button */}
            <Box sx={{ mb: 2 }}>
                <Button variant="outlined" startIcon={<Download />} onClick={handleExport} disabled={loading || freelancers.length === 0}>
                    Export CSV
                </Button>
            </Box>

            {/* Data Table */}
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                </Box>
            ) : freelancers.length > 0 ? (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                                    Rank
                                </TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Username</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Category</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                                    Total Earnings
                                </TableCell>
                                <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                                    Completed Orders
                                </TableCell>
                                <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                                    Avg Rating
                                </TableCell>
                                <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                                    Completion Rate
                                </TableCell>
                                <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                                    Avg Response Time
                                </TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                                    Wallet Balance
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {freelancers.map((freelancer, index) => (
                                <TableRow key={freelancer.user_id} hover>
                                    <TableCell align="center">
                                        <Typography variant="h6">{index + 1}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">{freelancer.username}</Typography>
                                        <Typography variant="caption" color="textSecondary">
                                            {freelancer.email}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>{freelancer.category}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold', color: '#4CAF50' }}>
                                        ${freelancer.total_earnings.toFixed(2)}
                                    </TableCell>
                                    <TableCell align="center">{freelancer.completed_orders}</TableCell>
                                    <TableCell align="center">
                                        <Typography
                                            sx={{
                                                color: freelancer.avg_rating >= 4.5 ? '#4CAF50' : freelancer.avg_rating >= 4 ? '#2196F3' : '#FF9800',
                                                fontWeight: 'bold',
                                            }}
                                        >
                                            {freelancer.avg_rating.toFixed(2)}⭐
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="center">
                                        {freelancer.completion_rate_percent.toFixed(1)}%
                                    </TableCell>
                                    <TableCell align="center">
                                        {freelancer.avg_response_time_hours.toFixed(1)}h
                                    </TableCell>
                                    <TableCell align="right">${freelancer.wallet_balance.toFixed(2)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            ) : (
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                    <Typography color="textSecondary">No freelancers found for the selected filters</Typography>
                </Paper>
            )}
        </Container>
    );
}
