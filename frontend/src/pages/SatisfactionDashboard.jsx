import {
    Box,
    Card,
    CardContent,
    Container,
    Grid,
    Paper,
    Typography,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    Tab,
    Tabs,
    LinearProgress,
    Chip
} from '@mui/material';
import { useEffect, useState } from 'react';
import { axiosInstance } from '../context/Authcontext';
import colors from '../helper/colors';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';

export default function SatisfactionDashboard() {
    const [metrics, setMetrics] = useState(null);
    const [trends, setTrends] = useState([]);
    const [drilldown, setDrilldown] = useState([]);
    const [tabValue, setTabValue] = useState(0);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedTier, setSelectedTier] = useState('');
    const [days, setDays] = useState(30);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAllData();
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const res = await axiosInstance.get('/api/services/categories');
            setCategories(res.data);
        } catch (err) {
            console.error('Failed to fetch categories', err);
        }
    };

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [metricsRes, trendsRes] = await Promise.all([
                axiosInstance.get('/api/satisfaction/metrics'),
                axiosInstance.get(`/api/satisfaction/trends?days=${days}`)
            ]);
            setMetrics(metricsRes.data);
            setTrends(trendsRes.data || []);
        } catch (err) {
            console.error('Failed to fetch satisfaction data', err);
        }
        setLoading(false);
    };

    const fetchDrilldown = async () => {
        try {
            const res = await axiosInstance.get('/api/satisfaction/drilldown', {
                params: {
                    category: selectedCategory || null,
                    freelancer_tier: selectedTier || null,
                    days: days
                }
            });
            setDrilldown(res.data || []);
        } catch (err) {
            console.error('Failed to fetch drilldown data', err);
        }
    };

    const handleCategoryChange = (e) => {
        setSelectedCategory(e.target.value);
    };

    const handleTierChange = (e) => {
        setSelectedTier(e.target.value);
    };

    const handleDaysChange = (e) => {
        const newDays = parseInt(e.target.value);
        setDays(newDays);
    };

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    const getSatisfactionColor = (value, max = 5) => {
        const percentage = (value / max) * 100;
        if (percentage >= 80) return '#4caf50';
        if (percentage >= 60) return '#ff9800';
        return '#f44336';
    };

    const MetricCard = ({ title, value, max, subtitle, icon }) => (
        <Card sx={{ height: '100%', bgcolor: colors.color5 }}>
            <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box>
                        <Typography color="textSecondary" gutterBottom>
                            {title}
                        </Typography>
                        <Typography variant="h4" component="div" color={colors.color1}>
                            {typeof value === 'number' ? value.toFixed(2) : value}
                        </Typography>
                    </Box>
                    {icon && <Box sx={{ fontSize: 32 }}>{icon}</Box>}
                </Box>
                {max && (
                    <>
                        <LinearProgress
                            variant="determinate"
                            value={Math.min((value / max) * 100, 100)}
                            sx={{
                                height: 8,
                                borderRadius: 4,
                                backgroundColor: '#e0e0e0',
                                '& .MuiLinearProgress-bar': {
                                    backgroundColor: getSatisfactionColor(value, max)
                                }
                            }}
                        />
                        <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                            {subtitle}
                        </Typography>
                    </>
                )}
            </CardContent>
        </Card>
    );

    if (loading) {
        return (
            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Typography>Loading satisfaction metrics...</Typography>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Typography variant="h4" color={colors.color1}>
                    Customer Satisfaction Dashboard
                </Typography>
                <Box display="flex" gap={2} alignItems="center">
                    <TextField
                        label="Days"
                        type="number"
                        value={days}
                        onChange={handleDaysChange}
                        size="small"
                        sx={{ width: 100 }}
                    />
                </Box>
            </Box>

            {/* Main Metrics */}
            <Grid container spacing={3} mb={4}>
                <Grid item xs={12} sm={6} md={3}>
                    <MetricCard
                        title="NPS Score"
                        value={metrics?.avg_nps_score || 0}
                        max={10}
                        subtitle="Net Promoter Score"
                        icon="📊"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <MetricCard
                        title="Avg Rating"
                        value={metrics?.avg_order_rating || 0}
                        max={5}
                        subtitle="From completed orders"
                        icon="⭐"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <MetricCard
                        title="Completion Rate"
                        value={(metrics?.order_completion_rate || 0) * 100}
                        max={100}
                        subtitle="Orders completed"
                        icon="✅"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <MetricCard
                        title="Repeat Rate"
                        value={(metrics?.repeat_client_rate || 0) * 100}
                        max={100}
                        subtitle="Clients who'd repeat"
                        icon="🔄"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <MetricCard
                        title="Response Time"
                        value={metrics?.avg_response_time_satisfaction || 0}
                        max={5}
                        subtitle="Satisfaction rating"
                        icon="⏱️"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <MetricCard
                        title="Revision Rate"
                        value={(metrics?.revision_request_rate || 0) * 100}
                        max={100}
                        subtitle="Orders with revisions"
                        icon="🔧"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <MetricCard
                        title="Dispute Rate"
                        value={(metrics?.dispute_rate || 0) * 100}
                        max={100}
                        subtitle="Disputed orders"
                        icon="⚠️"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <MetricCard
                        title="Total Surveys"
                        value={metrics?.total_surveys || 0}
                        subtitle="Satisfaction responses"
                        icon="📝"
                    />
                </Grid>
            </Grid>

            {/* Tabs for detailed views */}
            <Paper sx={{ mb: 4 }}>
                <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: `1px solid ${colors.color3}` }}>
                    <Tab label="Trends" />
                    <Tab label="Drill-Down Analysis" />
                </Tabs>

                {/* Trends Tab */}
                {tabValue === 0 && (
                    <Box sx={{ p: 3 }}>
                        {trends.length > 0 ? (
                            <>
                                <Typography variant="h6" mb={3} color={colors.color1}>
                                    Satisfaction Trends (Last {days} Days)
                                </Typography>
                                <ResponsiveContainer width="100%" height={400}>
                                    <LineChart data={trends}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Line
                                            type="monotone"
                                            dataKey="nps_score"
                                            stroke={colors.color2}
                                            name="NPS Score"
                                            strokeWidth={2}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="satisfaction_rating"
                                            stroke={colors.color1}
                                            name="Satisfaction"
                                            strokeWidth={2}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="completion_rate"
                                            stroke="#4caf50"
                                            name="Completion Rate"
                                            strokeWidth={2}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </>
                        ) : (
                            <Typography color="textSecondary">No trend data available</Typography>
                        )}
                    </Box>
                )}

                {/* Drill-Down Tab */}
                {tabValue === 1 && (
                    <Box sx={{ p: 3 }}>
                        <Box display="flex" gap={2} mb={3}>
                            <FormControl sx={{ minWidth: 200 }}>
                                <InputLabel>Category</InputLabel>
                                <Select
                                    value={selectedCategory}
                                    label="Category"
                                    onChange={handleCategoryChange}
                                >
                                    <MenuItem value="">All Categories</MenuItem>
                                    {categories.map((cat) => (
                                        <MenuItem key={cat} value={cat}>
                                            {cat}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <FormControl sx={{ minWidth: 200 }}>
                                <InputLabel>Freelancer Tier</InputLabel>
                                <Select
                                    value={selectedTier}
                                    label="Freelancer Tier"
                                    onChange={handleTierChange}
                                >
                                    <MenuItem value="">All Tiers</MenuItem>
                                    <MenuItem value="top">Top Tier (4.5+ stars)</MenuItem>
                                    <MenuItem value="experienced">Experienced (3.5-4.5 stars)</MenuItem>
                                    <MenuItem value="rising">Rising (Below 3.5 stars)</MenuItem>
                                </Select>
                            </FormControl>

                            <button
                                onClick={fetchDrilldown}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: colors.color2,
                                    color: colors.color5,
                                    border: 'none',
                                    borderRadius: 4,
                                    cursor: 'pointer',
                                    fontWeight: 600
                                }}
                            >
                                Analyze
                            </button>
                        </Box>

                        {drilldown.length > 0 ? (
                            <Grid container spacing={3}>
                                {drilldown.map((item, idx) => (
                                    <Grid item xs={12} key={idx}>
                                        <Paper sx={{ p: 3, bgcolor: colors.color5 }}>
                                            <Typography variant="h6" mb={2} color={colors.color1}>
                                                {item.category || 'All Categories'} - {item.freelancer_tier || 'All Tiers'}
                                            </Typography>
                                            <Grid container spacing={2}>
                                                <Grid item xs={12} sm={6} md={3}>
                                                    <Box>
                                                        <Typography variant="body2" color="textSecondary">
                                                            Avg Rating
                                                        </Typography>
                                                        <Typography variant="h6" color={colors.color1}>
                                                            {item.metrics.avg_order_rating.toFixed(2)} / 5
                                                        </Typography>
                                                    </Box>
                                                </Grid>
                                                <Grid item xs={12} sm={6} md={3}>
                                                    <Box>
                                                        <Typography variant="body2" color="textSecondary">
                                                            NPS Score
                                                        </Typography>
                                                        <Typography variant="h6" color={colors.color1}>
                                                            {item.metrics.avg_nps_score.toFixed(1)} / 10
                                                        </Typography>
                                                    </Box>
                                                </Grid>
                                                <Grid item xs={12} sm={6} md={3}>
                                                    <Box>
                                                        <Typography variant="body2" color="textSecondary">
                                                            Completion Rate
                                                        </Typography>
                                                        <Typography variant="h6" color={colors.color1}>
                                                            {(item.metrics.order_completion_rate * 100).toFixed(0)}%
                                                        </Typography>
                                                    </Box>
                                                </Grid>
                                                <Grid item xs={12} sm={6} md={3}>
                                                    <Box>
                                                        <Typography variant="body2" color="textSecondary">
                                                            Repeat Rate
                                                        </Typography>
                                                        <Typography variant="h6" color={colors.color1}>
                                                            {(item.metrics.repeat_client_rate * 100).toFixed(0)}%
                                                        </Typography>
                                                    </Box>
                                                </Grid>
                                            </Grid>
                                        </Paper>
                                    </Grid>
                                ))}
                            </Grid>
                        ) : (
                            <Typography color="textSecondary">
                                Select filters and click Analyze to see drill-down metrics
                            </Typography>
                        )}
                    </Box>
                )}
            </Paper>

            {/* Key Insights */}
            <Paper sx={{ p: 3, bgcolor: colors.color5 }}>
                <Typography variant="h6" mb={2} color={colors.color1}>
                    📈 Key Insights
                </Typography>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                        <Box display="flex" alignItems="center" gap={2} mb={1}>
                            <Box
                                sx={{
                                    width: 12,
                                    height: 12,
                                    borderRadius: '50%',
                                    backgroundColor:
                                        (metrics?.avg_nps_score || 0) >= 8
                                            ? '#4caf50'
                                            : (metrics?.avg_nps_score || 0) >= 5
                                            ? '#ff9800'
                                            : '#f44336'
                                }}
                            />
                            <Typography>
                                NPS Score: {(metrics?.avg_nps_score || 0).toFixed(1)}/10 -{' '}
                                {(metrics?.avg_nps_score || 0) >= 8
                                    ? 'Excellent'
                                    : (metrics?.avg_nps_score || 0) >= 5
                                    ? 'Good'
                                    : 'Needs Improvement'}
                            </Typography>
                        </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Box display="flex" alignItems="center" gap={2} mb={1}>
                            <Box
                                sx={{
                                    width: 12,
                                    height: 12,
                                    borderRadius: '50%',
                                    backgroundColor:
                                        (metrics?.order_completion_rate || 0) >= 0.95
                                            ? '#4caf50'
                                            : (metrics?.order_completion_rate || 0) >= 0.8
                                            ? '#ff9800'
                                            : '#f44336'
                                }}
                            />
                            <Typography>
                                Completion Rate: {((metrics?.order_completion_rate || 0) * 100).toFixed(0)}% -
                                {(metrics?.order_completion_rate || 0) >= 0.95
                                    ? 'Excellent'
                                    : (metrics?.order_completion_rate || 0) >= 0.8
                                    ? 'Good'
                                    : 'Needs Improvement'}
                            </Typography>
                        </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Box display="flex" alignItems="center" gap={2} mb={1}>
                            <Box
                                sx={{
                                    width: 12,
                                    height: 12,
                                    borderRadius: '50%',
                                    backgroundColor:
                                        (metrics?.revision_request_rate || 0) <= 0.1
                                            ? '#4caf50'
                                            : (metrics?.revision_request_rate || 0) <= 0.2
                                            ? '#ff9800'
                                            : '#f44336'
                                }}
                            />
                            <Typography>
                                Revision Rate: {((metrics?.revision_request_rate || 0) * 100).toFixed(0)}% -
                                {(metrics?.revision_request_rate || 0) <= 0.1
                                    ? 'Low (Good)'
                                    : (metrics?.revision_request_rate || 0) <= 0.2
                                    ? 'Moderate'
                                    : 'High'}
                            </Typography>
                        </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Box display="flex" alignItems="center" gap={2} mb={1}>
                            <Box
                                sx={{
                                    width: 12,
                                    height: 12,
                                    borderRadius: '50%',
                                    backgroundColor:
                                        (metrics?.repeat_client_rate || 0) >= 0.5
                                            ? '#4caf50'
                                            : (metrics?.repeat_client_rate || 0) >= 0.3
                                            ? '#ff9800'
                                            : '#f44336'
                                }}
                            />
                            <Typography>
                                Repeat Rate: {((metrics?.repeat_client_rate || 0) * 100).toFixed(0)}% -
                                {(metrics?.repeat_client_rate || 0) >= 0.5
                                    ? 'Strong'
                                    : (metrics?.repeat_client_rate || 0) >= 0.3
                                    ? 'Moderate'
                                    : 'Weak'}
                            </Typography>
                        </Box>
                    </Grid>
                </Grid>
            </Paper>
        </Container>
    );
}
