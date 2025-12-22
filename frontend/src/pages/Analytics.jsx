import {
    Box,
    Card,
    CardContent,
    Container,
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
    TextField,
    Typography
} from '@mui/material';
import { useEffect, useState } from 'react';
import { axiosInstance, useAuth } from '../context/Authcontext';
import colors from '../helper/colors';

export default function Analytics() {
    const { user } = useAuth();
    const [services, setServices] = useState([]);
    const [selectedService, setSelectedService] = useState('');
    const [metrics, setMetrics] = useState([]);
    const [summary, setSummary] = useState(null);
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        const fetchServices = async () => {
            try {
                // Use the existing endpoint to get freelancer services
                // We need to pass the freelancer_id (user.id)
                const res = await axiosInstance.get(`/api/services/freelancer/${user.id}`);
                setServices(res.data);
                if (res.data.length > 0) {
                    setSelectedService(res.data[0].service_id);
                }
            } catch (err) {
                console.error("Failed to fetch services", err);
            }
        };
        if (user) fetchServices();
    }, [user]);

    useEffect(() => {
        const fetchMetrics = async () => {
            if (!selectedService) return;
            try {
                const [metricsRes, summaryRes] = await Promise.all([
                    axiosInstance.get(`/api/analytics/metrics/${selectedService}?start_date=${dateRange.start}&end_date=${dateRange.end}`),
                    axiosInstance.get(`/api/analytics/summary/${selectedService}?start_date=${dateRange.start}&end_date=${dateRange.end}`)
                ]);
                setMetrics(metricsRes.data);
                setSummary(summaryRes.data);
            } catch (err) {
                console.error("Failed to fetch metrics", err);
            }
        };
        fetchMetrics();
    }, [selectedService, dateRange]);

    const StatCard = ({ title, value, subtext }) => (
        <Card sx={{ height: '100%', bgcolor: colors.color5 }}>
            <CardContent>
                <Typography color="textSecondary" gutterBottom>
                    {title}
                </Typography>
                <Typography variant="h4" component="div" color={colors.color1}>
                    {value}
                </Typography>
                {subtext && (
                    <Typography variant="body2" color="textSecondary">
                        {subtext}
                    </Typography>
                )}
            </CardContent>
        </Card>
    );

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Typography variant="h4" color={colors.color1}>
                    Service Analytics
                </Typography>

                <Box display="flex" gap={2}>
                    <FormControl sx={{ minWidth: 200 }}>
                        <InputLabel>Service</InputLabel>
                        <Select
                            value={selectedService}
                            label="Service"
                            onChange={(e) => setSelectedService(e.target.value)}
                        >
                            {services.map((s) => (
                                <MenuItem key={s.service_id} value={s.service_id}>
                                    {s.title}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <TextField
                        label="Start Date"
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                        InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                        label="End Date"
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                        InputLabelProps={{ shrink: true }}
                    />
                </Box>
            </Box>

            {summary && (
                <Grid container spacing={3} mb={4}>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatCard title="Total Views" value={summary.total_views} />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatCard title="Total Clicks" value={summary.total_clicks} />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatCard title="Impressions" value={summary.total_impressions} />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatCard
                            title="CTR"
                            value={`${(summary.avg_ctr * 100).toFixed(2)}%`}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatCard
                            title="Conversion Rate"
                            value={`${(summary.avg_conversion_rate * 100).toFixed(2)}%`}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatCard
                            title="Total Earnings"
                            value={`$${summary.total_earnings.toFixed(2)}`}
                        />
                    </Grid>
                </Grid>
            )}

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Date</TableCell>
                            <TableCell align="right">Impressions</TableCell>
                            <TableCell align="right">Views</TableCell>
                            <TableCell align="right">Clicks</TableCell>
                            <TableCell align="right">Orders</TableCell>
                            <TableCell align="right">CTR</TableCell>
                            <TableCell align="right">Conversion Rate</TableCell>
                            <TableCell align="right">Earnings</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {metrics.map((row) => (
                            <TableRow key={row.date}>
                                <TableCell component="th" scope="row">
                                    {row.date}
                                </TableCell>
                                <TableCell align="right">{row.impressions_count}</TableCell>
                                <TableCell align="right">{row.views_count}</TableCell>
                                <TableCell align="right">{row.clicks_count}</TableCell>
                                <TableCell align="right">{row.orders_count}</TableCell>
                                <TableCell align="right">{(row.ctr * 100).toFixed(2)}%</TableCell>
                                <TableCell align="right">{(row.conversion_rate * 100).toFixed(2)}%</TableCell>
                                <TableCell align="right">${row.total_earnings.toFixed(2)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Container>
    );
}
