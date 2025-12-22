import { useEffect, useMemo, useState } from 'react';
import {
    Box,
    Grid,
    Paper,
    Stack,
    Typography,
    TextField,
    MenuItem,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    Chip,
    Divider,
    Skeleton,
} from '@mui/material';
import { axiosInstance } from '../context/Authcontext';
import { useAuth } from '../context/Authcontext';

const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function StatCard({ label, value, accent }) {
    return (
        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, bgcolor: accent || 'linear-gradient(120deg, #0f172a, #1e293b)', color: '#0f172a' }}>
            <Typography variant="body2" sx={{ opacity: 0.7 }}>{label}</Typography>
            <Typography variant="h5" fontWeight={700}>{value}</Typography>
        </Paper>
    );
}

function BarViz({ items }) {
    const max = Math.max(...items.map((i) => i.value), 1);
    return (
        <Stack spacing={1} sx={{ width: '100%' }}>
            {items.map((i) => (
                <Box key={i.label}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                        <Typography variant="body2" fontWeight={600}>{i.label}</Typography>
                        <Typography variant="body2" sx={{ opacity: 0.7 }}>{money.format(i.value)}</Typography>
                    </Stack>
                    <Box sx={{ height: 10, borderRadius: 999, bgcolor: 'rgba(15,23,42,0.08)' }}>
                        <Box sx={{ height: '100%', width: `${(i.value / max) * 100}%`, borderRadius: 999, bgcolor: '#0ea5e9' }} />
                    </Box>
                </Box>
            ))}
        </Stack>
    );
}

function SparkBar({ points }) {
    const max = Math.max(...points.map((p) => p.total_earned), 1);
    return (
        <Stack direction="row" alignItems="flex-end" spacing={1} sx={{ height: 140 }}>
            {points.map((p) => {
                const label = new Date(p.period).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                return (
                    <Stack key={p.period} spacing={0.5} alignItems="center" sx={{ width: 36 }}>
                        <Box sx={{ width: '100%', bgcolor: '#22c55e', borderRadius: 8, height: `${(p.total_earned / max) * 100}%` }}>
                            <Box sx={{ position: 'absolute', width: 0, height: 0 }} aria-hidden />
                        </Box>
                        <Typography variant="caption" sx={{ opacity: 0.7 }}>{label}</Typography>
                    </Stack>
                );
            })}
        </Stack>
    );
}

export default function Earnings() {
    const { user } = useAuth();
    const freelancerId = user?.id;

    const [summary, setSummary] = useState(null);
    const [history, setHistory] = useState([]);
    const [historyTotal, setHistoryTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [breakdown, setBreakdown] = useState([]);
    const [series, setSeries] = useState([]);
    const [filters, setFilters] = useState({ start: '', end: '', status: '', serviceId: '', granularity: 'month' });
    const [loading, setLoading] = useState({ summary: true, history: true, breakdown: true, series: true });
    const [error, setError] = useState('');

    useEffect(() => {
        if (!freelancerId) return;
        setLoading((p) => ({ ...p, summary: true }));
        axiosInstance
            .get(`/api/earnings/summary`, { params: { freelancer_id: freelancerId } })
            .then((res) => {
                setSummary(res.data);
                setError('');
            })
            .catch((e) => setError(e.message || 'Failed to load summary'))
            .finally(() => setLoading((p) => ({ ...p, summary: false })));
    }, [freelancerId]);

    useEffect(() => {
        if (!freelancerId) return;
        setLoading((p) => ({ ...p, breakdown: true }));
        axiosInstance
            .get(`/api/earnings/by-service`, { params: { freelancer_id: freelancerId } })
            .then((res) => {
                setBreakdown(res.data || []);
                setError('');
            })
            .catch((e) => setError(e.message || 'Failed to load breakdown'))
            .finally(() => setLoading((p) => ({ ...p, breakdown: false })));
    }, [freelancerId]);

    useEffect(() => {
        if (!freelancerId) return;
        setLoading((p) => ({ ...p, series: true }));
        axiosInstance
            .get(`/api/earnings/timeseries`, {
                params: {
                    freelancer_id: freelancerId,
                    granularity: filters.granularity,
                    start_date: filters.start || undefined,
                    end_date: filters.end || undefined,
                },
            })
            .then((res) => {
                setSeries(res.data || []);
                setError('');
            })
            .catch((e) => setError(e.message || 'Failed to load trend'))
            .finally(() => setLoading((p) => ({ ...p, series: false })));
    }, [freelancerId, filters.granularity, filters.start, filters.end]);

    useEffect(() => {
        if (!freelancerId) return;
        setLoading((p) => ({ ...p, history: true }));
        axiosInstance
            .get(`/api/earnings/history`, {
                params: {
                    freelancer_id: freelancerId,
                    start_date: filters.start || undefined,
                    end_date: filters.end || undefined,
                    status: filters.status || undefined,
                    service_id: filters.serviceId || undefined,
                    page: page + 1,
                    page_size: rowsPerPage,
                },
            })
            .then((res) => {
                setHistory(res.data.items || []);
                setHistoryTotal(res.data.total || 0);
                setError('');
            })
            .catch((e) => setError(e.message || 'Failed to load history'))
            .finally(() => setLoading((p) => ({ ...p, history: false })));
    }, [freelancerId, filters.start, filters.end, filters.status, filters.serviceId, page, rowsPerPage]);

    const historyRows = useMemo(() => history.map((h) => ({
        ...h,
        payment_date: new Date(h.payment_date).toLocaleDateString(),
    })), [history]);

    if (!freelancerId) {
        return (
            <Box sx={{ p: 4 }}>
                <Typography variant="h6">Login as a freelancer to view earnings.</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3, bgcolor: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)', minHeight: '100vh' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                <div>
                    <Typography variant="h4" fontWeight={800}>Earnings</Typography>
                    <Typography variant="body1" sx={{ opacity: 0.7 }}>Financial pulse of your freelance work.</Typography>
                </div>
                <Stack direction="row" spacing={2}>
                    <TextField
                        label="Start"
                        type="date"
                        size="small"
                        value={filters.start}
                        onChange={(e) => setFilters((p) => ({ ...p, start: e.target.value }))}
                        InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                        label="End"
                        type="date"
                        size="small"
                        value={filters.end}
                        onChange={(e) => setFilters((p) => ({ ...p, end: e.target.value }))}
                        InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                        label="Status"
                        select
                        size="small"
                        value={filters.status}
                        onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))}
                        sx={{ minWidth: 140 }}
                    >
                        <MenuItem value="">Any</MenuItem>
                        <MenuItem value="completed">Completed</MenuItem>
                        <MenuItem value="delivered">Delivered</MenuItem>
                        <MenuItem value="in_progress">In Progress</MenuItem>
                        <MenuItem value="pending">Pending</MenuItem>
                        <MenuItem value="revision_requested">Revision Requested</MenuItem>
                    </TextField>
                    <TextField
                        label="Service"
                        select
                        size="small"
                        value={filters.serviceId}
                        onChange={(e) => setFilters((p) => ({ ...p, serviceId: e.target.value }))}
                        sx={{ minWidth: 180 }}
                    >
                        <MenuItem value="">All services</MenuItem>
                        {breakdown.map((b) => (
                            <MenuItem key={b.service_id} value={b.service_id}>{b.service_title}</MenuItem>
                        ))}
                    </TextField>
                    <TextField
                        label="Granularity"
                        select
                        size="small"
                        value={filters.granularity}
                        onChange={(e) => setFilters((p) => ({ ...p, granularity: e.target.value }))}
                        sx={{ minWidth: 140 }}
                    >
                        <MenuItem value="day">Day</MenuItem>
                        <MenuItem value="week">Week</MenuItem>
                        <MenuItem value="month">Month</MenuItem>
                    </TextField>
                </Stack>
            </Stack>

            {error && (
                <Paper sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: '#fef2f2' }}>
                    <Typography color="error">{error}</Typography>
                </Paper>
            )}

            <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                    {loading.summary ? <Skeleton variant="rectangular" height={96} /> : (
                        <StatCard label="Available Balance" value={money.format(summary?.available_balance || 0)} />
                    )}
                </Grid>
                <Grid item xs={12} md={3}>
                    {loading.summary ? <Skeleton variant="rectangular" height={96} /> : (
                        <StatCard label="Pending Balance" value={money.format(summary?.pending_balance || 0)} accent="linear-gradient(120deg, #f97316, #fb923c)" />
                    )}
                </Grid>
                <Grid item xs={12} md={3}>
                    {loading.summary ? <Skeleton variant="rectangular" height={96} /> : (
                        <StatCard label="Lifetime Earned" value={money.format(summary?.total_earned || 0)} accent="linear-gradient(120deg, #0ea5e9, #38bdf8)" />
                    )}
                </Grid>
                <Grid item xs={12} md={3}>
                    {loading.summary ? <Skeleton variant="rectangular" height={96} /> : (
                        <StatCard label="Avg Order Value" value={money.format(summary?.average_order_value || 0)} accent="linear-gradient(120deg, #22c55e, #86efac)" />
                    )}
                </Grid>
            </Grid>

            <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} md={8}>
                    <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, height: '100%' }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                            <Typography variant="h6" fontWeight={700}>Earnings Trend</Typography>
                            <Chip label={filters.granularity.toUpperCase()} size="small" />
                        </Stack>
                        {loading.series ? (
                            <Skeleton variant="rectangular" height={140} />
                        ) : (
                            series.length ? <SparkBar points={series} /> : <Typography variant="body2" sx={{ opacity: 0.7 }}>No earnings yet.</Typography>
                        )}
                    </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, height: '100%' }}>
                        <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>By Service</Typography>
                        {loading.breakdown ? (
                            <Skeleton variant="rectangular" height={180} />
                        ) : (
                            breakdown.length ? <BarViz items={breakdown.map((b) => ({ label: b.service_title, value: b.total_earned }))} /> : (
                                <Typography variant="body2" sx={{ opacity: 0.7 }}>No paid orders yet.</Typography>
                            )
                        )}
                    </Paper>
                </Grid>
            </Grid>

            <Paper elevation={0} sx={{ p: 2.5, mt: 2, borderRadius: 2 }}>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>Earnings History</Typography>
                <Divider sx={{ mb: 2 }} />
                {loading.history ? (
                    <Skeleton variant="rectangular" height={320} />
                ) : (
                    <>
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Date</TableCell>
                                        <TableCell>Service</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell align="right">Amount</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {historyRows.map((row) => (
                                        <TableRow key={row.payment_id}>
                                            <TableCell>{row.payment_date}</TableCell>
                                            <TableCell>{row.service_title}</TableCell>
                                            <TableCell>
                                                <Chip label={row.order_status} size="small" />
                                            </TableCell>
                                            <TableCell align="right">{money.format(row.amount)}</TableCell>
                                        </TableRow>
                                    ))}
                                    {!historyRows.length && (
                                        <TableRow>
                                            <TableCell colSpan={4} align="center" sx={{ py: 3, opacity: 0.6 }}>
                                                No earnings recorded yet.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <TablePagination
                            component="div"
                            count={historyTotal}
                            page={page}
                            onPageChange={(_, newPage) => setPage(newPage)}
                            rowsPerPage={rowsPerPage}
                            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                            rowsPerPageOptions={[5, 10, 20, 50]}
                        />
                    </>
                )}
            </Paper>
        </Box>
    );
}
