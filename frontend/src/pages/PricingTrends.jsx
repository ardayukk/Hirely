import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  CircularProgress,
  Alert,
  Chip,
  Button
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import axiosInstance from '../utils/api';
import { useAuth } from '../context/Authcontext';

const PricingTrends = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState({
    summary: true,
    trends: true,
    distribution: true,
    correlation: true,
    undercutting: true,
    adoption: true
  });
  const [errors, setErrors] = useState({});
  
  // Data states
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [distribution, setDistribution] = useState([]);
  const [correlation, setCorrelation] = useState([]);
  const [undercutting, setUndercutting] = useState([]);
  const [adoption, setAdoption] = useState([]);

  // Filter states
  const [granularity, setGranularity] = useState('month');
  const [bucketSize, setBucketSize] = useState(10);
  const [thresholdPercentage, setThresholdPercentage] = useState(20);
  const [sortBy, setSortBy] = useState('price_diff_pct');
  const [sortOrder, setSortOrder] = useState('desc');

  // Check access
  if (user?.role !== 'admin') {
    return (
      <Container sx={{ py: 4 }}>
        <Typography color="error">Access Denied: Admin only</Typography>
      </Container>
    );
  }

  // Fetch all data
  useEffect(() => {
    const fetchData = async () => {
      // Fetch summary
      try {
        setLoading(prev => ({ ...prev, summary: true }));
        const summaryRes = await axiosInstance.get('/api/pricing-analytics/summary');
        setSummary(summaryRes.data);
        setErrors(prev => ({ ...prev, summary: null }));
      } catch (error) {
        setErrors(prev => ({ ...prev, summary: error.response?.data?.detail || 'Failed to load' }));
      } finally {
        setLoading(prev => ({ ...prev, summary: false }));
      }

      // Fetch trends
      try {
        setLoading(prev => ({ ...prev, trends: true }));
        const trendsRes = await axiosInstance.get('/api/pricing-analytics/category-trends', {
          params: { granularity }
        });
        setTrends(trendsRes.data);
        setErrors(prev => ({ ...prev, trends: null }));
      } catch (error) {
        setErrors(prev => ({ ...prev, trends: error.response?.data?.detail || 'Failed to load' }));
      } finally {
        setLoading(prev => ({ ...prev, trends: false }));
      }

      // Fetch distribution
      try {
        setLoading(prev => ({ ...prev, distribution: true }));
        const distRes = await axiosInstance.get('/api/pricing-analytics/price-distribution', {
          params: { bucket_size: bucketSize }
        });
        setDistribution(distRes.data);
        setErrors(prev => ({ ...prev, distribution: null }));
      } catch (error) {
        setErrors(prev => ({ ...prev, distribution: error.response?.data?.detail || 'Failed to load' }));
      } finally {
        setLoading(prev => ({ ...prev, distribution: false }));
      }

      // Fetch correlation
      try {
        setLoading(prev => ({ ...prev, correlation: true }));
        const corrRes = await axiosInstance.get('/api/pricing-analytics/price-demand-correlation');
        setCorrelation(corrRes.data);
        setErrors(prev => ({ ...prev, correlation: null }));
      } catch (error) {
        setErrors(prev => ({ ...prev, correlation: error.response?.data?.detail || 'Failed to load' }));
      } finally {
        setLoading(prev => ({ ...prev, correlation: false }));
      }

      // Fetch undercutting
      try {
        setLoading(prev => ({ ...prev, undercutting: true }));
        const underRes = await axiosInstance.get('/api/pricing-analytics/undercutting-patterns', {
          params: { threshold_percentage: thresholdPercentage }
        });
        setUndercutting(underRes.data);
        setErrors(prev => ({ ...prev, undercutting: null }));
      } catch (error) {
        setErrors(prev => ({ ...prev, undercutting: error.response?.data?.detail || 'Failed to load' }));
      } finally {
        setLoading(prev => ({ ...prev, undercutting: false }));
      }

      // Fetch adoption
      try {
        setLoading(prev => ({ ...prev, adoption: true }));
        const adoptRes = await axiosInstance.get('/api/pricing-analytics/premium-adoption', {
          params: { granularity }
        });
        setAdoption(adoptRes.data);
        setErrors(prev => ({ ...prev, adoption: null }));
      } catch (error) {
        setErrors(prev => ({ ...prev, adoption: error.response?.data?.detail || 'Failed to load' }));
      } finally {
        setLoading(prev => ({ ...prev, adoption: false }));
      }
    };

    fetchData();
  }, [granularity, bucketSize, thresholdPercentage]);

  // Transform trends data for multi-series line chart
  const trendsChartData = useMemo(() => {
    if (!trends.length) return [];
    const grouped = {};
    trends.forEach(item => {
      if (!grouped[item.period]) {
        grouped[item.period] = { period: item.period };
      }
      grouped[item.period][item.category] = item.avg_price;
    });
    return Object.values(grouped);
  }, [trends]);

  // Get unique categories
  const categories = useMemo(() => {
    return [...new Set(trends.map(t => t.category))];
  }, [trends]);

  const categoryColors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0'];

  // Sort undercutting data
  const sortedUndercutting = useMemo(() => {
    return [...undercutting].sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [undercutting, sortBy, sortOrder]);

  const handleSortRequest = (property) => {
    const isAsc = sortBy === property && sortOrder === 'asc';
    setSortOrder(isAsc ? 'desc' : 'asc');
    setSortBy(property);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/admin')}
          sx={{ mr: 2 }}
        >
          Back to Admin
        </Button>
        <Box>
          <Typography variant="h4" gutterBottom>
            Pricing Trends Analytics
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Platform-wide insights into marketplace pricing trends and patterns
          </Typography>
        </Box>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Median Price
              </Typography>
              {loading.summary ? (
                <CircularProgress size={20} />
              ) : errors.summary ? (
                <Typography color="error" variant="body2">{errors.summary}</Typography>
              ) : (
                <>
                  <Typography variant="h5">
                    ${summary?.median_price?.toFixed(2) || '0.00'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Avg: ${summary?.avg_price?.toFixed(2) || '0.00'}
                  </Typography>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Price Volatility
              </Typography>
              {loading.summary ? (
                <CircularProgress size={20} />
              ) : (
                <>
                  <Typography variant="h5">
                    ${summary?.std_dev_price?.toFixed(2) || '0.00'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Standard deviation
                  </Typography>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Most Expensive
              </Typography>
              {loading.summary ? (
                <CircularProgress size={20} />
              ) : (
                <>
                  <Typography variant="h6" noWrap>
                    {summary?.most_expensive_category || 'N/A'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    ${summary?.most_expensive_avg?.toFixed(2) || '0.00'} avg
                  </Typography>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom variant="body2">
                Most Competitive
              </Typography>
              {loading.summary ? (
                <CircularProgress size={20} />
              ) : (
                <>
                  <Typography variant="h6" noWrap>
                    {summary?.most_competitive_category || 'N/A'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {summary?.most_competitive_count || 0} services
                  </Typography>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Granularity</InputLabel>
              <Select
                value={granularity}
                label="Granularity"
                onChange={(e) => setGranularity(e.target.value)}
              >
                <MenuItem value="day">Daily</MenuItem>
                <MenuItem value="week">Weekly</MenuItem>
                <MenuItem value="month">Monthly</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={4} md={3}>
            <TextField
              fullWidth
              size="small"
              label="Price Bucket Size"
              type="number"
              value={bucketSize}
              onChange={(e) => setBucketSize(Number(e.target.value))}
              inputProps={{ min: 5, max: 100, step: 5 }}
            />
          </Grid>

          <Grid item xs={12} sm={4} md={3}>
            <TextField
              fullWidth
              size="small"
              label="Undercutting Threshold %"
              type="number"
              value={thresholdPercentage}
              onChange={(e) => setThresholdPercentage(Number(e.target.value))}
              inputProps={{ min: 0, max: 100, step: 5 }}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Category Trends Chart */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Average Price by Category Over Time
        </Typography>
        {loading.trends ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : errors.trends ? (
          <Alert severity="error">{errors.trends}</Alert>
        ) : trendsChartData.length === 0 ? (
          <Typography color="text.secondary" align="center" p={4}>No data available</Typography>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={trendsChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
              <Legend />
              {categories.map((cat, idx) => (
                <Line
                  key={cat}
                  type="monotone"
                  dataKey={cat}
                  stroke={categoryColors[idx % categoryColors.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </Paper>

      {/* Price Distribution Histogram */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Price Distribution
        </Typography>
        {loading.distribution ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : errors.distribution ? (
          <Alert severity="error">{errors.distribution}</Alert>
        ) : distribution.length === 0 ? (
          <Typography color="text.secondary" align="center" p={4}>No data available</Typography>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={distribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="bucket_label" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#8884d8" name="Services" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Paper>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Price vs Demand Correlation */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Price vs. Order Volume
            </Typography>
            {loading.correlation ? (
              <Box display="flex" justifyContent="center" p={4}>
                <CircularProgress />
              </Box>
            ) : errors.correlation ? (
              <Alert severity="error">{errors.correlation}</Alert>
            ) : correlation.length === 0 ? (
              <Typography color="text.secondary" align="center" p={4}>No data available</Typography>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="avg_price" name="Price" unit="$" />
                  <YAxis dataKey="total_orders" name="Orders" />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Legend />
                  <Scatter name="Services" data={correlation} fill="#82ca9d" />
                </ScatterChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        {/* Premium Tier Adoption */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Premium Tier Adoption
            </Typography>
            {loading.adoption ? (
              <Box display="flex" justifyContent="center" p={4}>
                <CircularProgress />
              </Box>
            ) : errors.adoption ? (
              <Alert severity="error">{errors.adoption}</Alert>
            ) : adoption.length === 0 ? (
              <Typography color="text.secondary" align="center" p={4}>No data available</Typography>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={adoption}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="basic_count" stackId="1" stroke="#8884d8" fill="#8884d8" name="Basic" />
                  <Area type="monotone" dataKey="standard_count" stackId="1" stroke="#82ca9d" fill="#82ca9d" name="Standard" />
                  <Area type="monotone" dataKey="premium_count" stackId="1" stroke="#ffc658" fill="#ffc658" name="Premium" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Undercutting Patterns Table */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Undercutting Patterns
        </Typography>
        {loading.undercutting ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : errors.undercutting ? (
          <Alert severity="error">{errors.undercutting}</Alert>
        ) : sortedUndercutting.length === 0 ? (
          <Typography color="text.secondary" align="center" p={4}>No undercutting detected</Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Service</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortBy === 'service_price'}
                      direction={sortBy === 'service_price' ? sortOrder : 'asc'}
                      onClick={() => handleSortRequest('service_price')}
                    >
                      Price
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortBy === 'category_avg'}
                      direction={sortBy === 'category_avg' ? sortOrder : 'asc'}
                      onClick={() => handleSortRequest('category_avg')}
                    >
                      Category Avg
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortBy === 'price_diff_pct'}
                      direction={sortBy === 'price_diff_pct' ? sortOrder : 'asc'}
                      onClick={() => handleSortRequest('price_diff_pct')}
                    >
                      % Below Avg
                    </TableSortLabel>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedUndercutting.slice(0, 20).map((row) => (
                  <TableRow key={row.service_id}>
                    <TableCell>{row.service_title}</TableCell>
                    <TableCell>
                      <Chip label={row.category} size="small" />
                    </TableCell>
                    <TableCell>${row.service_price.toFixed(2)}</TableCell>
                    <TableCell>${row.category_avg.toFixed(2)}</TableCell>
                    <TableCell>
                      <Chip
                        label={`${row.price_diff_pct.toFixed(1)}%`}
                        size="small"
                        color={row.price_diff_pct > 30 ? 'error' : 'warning'}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Container>
  );
};

export default PricingTrends;