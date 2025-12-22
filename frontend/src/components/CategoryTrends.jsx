import {
    Box,
    Card,
    CardContent,
    FormControl,
    Grid,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography
} from '@mui/material';
import { useEffect, useState } from 'react';
import {
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from 'recharts';
import { axiosInstance } from '../context/Authcontext';
import colors from '../helper/colors';

export default function CategoryTrends() {
    const [trends, setTrends] = useState([]);
    const [growth, setGrowth] = useState([]);
    const [metadata, setMetadata] = useState({});
    const [period, setPeriod] = useState('month');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const endDate = new Date().toISOString().split('T')[0];
                const startDate = new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString().split('T')[0];

                const [trendsRes, growthRes, metadataRes] = await Promise.all([
                    axiosInstance.get(`/api/analytics/categories/trends?start_date=${startDate}&end_date=${endDate}`),
                    axiosInstance.get(`/api/analytics/categories/growth?period=${period}`),
                    axiosInstance.get('/api/analytics/categories/metadata')
                ]);

                setTrends(trendsRes.data);
                setGrowth(growthRes.data);

                const metaMap = {};
                metadataRes.data.forEach(m => metaMap[m.category] = m);
                setMetadata(metaMap);
            } catch (error) {
                console.error("Error fetching category analytics:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [period]);

    const handleMetadataUpdate = async (category, field, value) => {
        try {
            await axiosInstance.post(`/api/analytics/categories/${category}/metadata`, {
                [field]: value
            });
            setMetadata(prev => ({
                ...prev,
                [category]: {
                    ...prev[category],
                    [field]: value
                }
            }));
        } catch (error) {
            console.error("Error updating metadata:", error);
        }
    };

    // Process trends data for chart (group by date)
    const chartData = trends.reduce((acc, curr) => {
        const date = curr.date;
        if (!acc[date]) {
            acc[date] = { date };
        }
        acc[date][curr.category] = curr.total_revenue;
        return acc;
    }, {});

    const formattedChartData = Object.values(chartData).sort((a, b) => new Date(a.date) - new Date(b.date));
    const categories = [...new Set(trends.map(t => t.category))];
    const categoryColors = [colors.color1, colors.color2, colors.color3, colors.color4, colors.color5, '#8884d8', '#82ca9d'];

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h5">Category Performance Trends</Typography>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Growth Period</InputLabel>
                    <Select
                        value={period}
                        label="Growth Period"
                        onChange={(e) => setPeriod(e.target.value)}
                    >
                        <MenuItem value="week">Weekly</MenuItem>
                        <MenuItem value="month">Monthly</MenuItem>
                    </Select>
                </FormControl>
            </Box>

            <Grid container spacing={3}>
                {/* Revenue Trend Chart */}
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Revenue by Category (Last 6 Months)</Typography>
                            <Box height={400}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={formattedChartData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        {categories.map((cat, index) => (
                                            <Line
                                                key={cat}
                                                type="monotone"
                                                dataKey={cat}
                                                stroke={categoryColors[index % categoryColors.length]}
                                                activeDot={{ r: 8 }}
                                            />
                                        ))}
                                    </LineChart>
                                </ResponsiveContainer>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Growth Table */}
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Category Growth ({period === 'week' ? 'Week over Week' : 'Month over Month'})</Typography>
                            <TableContainer component={Paper} elevation={0}>
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Category</TableCell>
                                            <TableCell align="right">Current Revenue</TableCell>
                                            <TableCell align="right">Previous Revenue</TableCell>
                                            <TableCell align="right">Growth Rate</TableCell>
                                            <TableCell align="right">Total Orders</TableCell>
                                            <TableCell align="center">Status</TableCell>
                                            <TableCell align="center">Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {growth.map((row) => (
                                            <TableRow key={row.category}>
                                                <TableCell component="th" scope="row">
                                                    {row.category}
                                                    {metadata[row.category]?.is_promoted && (
                                                        <Chip label="Promoted" color="primary" size="small" sx={{ ml: 1 }} />
                                                    )}
                                                    {metadata[row.category]?.recruitment_needed && (
                                                        <Chip label="Recruiting" color="warning" size="small" sx={{ ml: 1 }} />
                                                    )}
                                                </TableCell>
                                                <TableCell align="right">${row.current_period_revenue.toFixed(2)}</TableCell>
                                                <TableCell align="right">${row.previous_period_revenue.toFixed(2)}</TableCell>
                                                <TableCell align="right" sx={{
                                                    color: row.growth_rate > 0 ? 'green' : (row.growth_rate < 0 ? 'red' : 'inherit'),
                                                    fontWeight: 'bold'
                                                }}>
                                                    {row.growth_rate.toFixed(1)}%
                                                </TableCell>
                                                <TableCell align="right">{row.total_orders}</TableCell>
                                                <TableCell align="center">
                                                    {row.growth_rate < -10 && <Chip label="Declining" color="error" size="small" variant="outlined" />}
                                                    {row.growth_rate > 20 && <Chip label="Booming" color="success" size="small" variant="outlined" />}
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Box display="flex" flexDirection="column" gap={1}>
                                                        <FormControlLabel
                                                            control={
                                                                <Switch
                                                                    size="small"
                                                                    checked={metadata[row.category]?.is_promoted || false}
                                                                    onChange={(e) => handleMetadataUpdate(row.category, 'is_promoted', e.target.checked)}
                                                                />
                                                            }
                                                            label="Promote"
                                                        />
                                                        <FormControlLabel
                                                            control={
                                                                <Switch
                                                                    size="small"
                                                                    checked={metadata[row.category]?.recruitment_needed || false}
                                                                    onChange={(e) => handleMetadataUpdate(row.category, 'recruitment_needed', e.target.checked)}
                                                                />
                                                            }
                                                            label="Recruit"
                                                        />
                                                    </Box>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}

