import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Fade,
  Alert,
  Rating,
  Stack,
  Container,
  CircularProgress,
  useTheme,
} from "@mui/material";
import { Search as SearchIcon, Clear as ClearIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import colors from "../helper/colors";
import { axiosInstance } from "../context/Authcontext";

export default function Services() {
  const navigate = useNavigate();
  const theme = useTheme();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    category: "",
    min_price: "",
    max_price: "",
    delivery_time: "",
    rating: "",
    sort: "recency",
  });

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setError("");
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.category) params.append("category", filters.category);
      if (filters.min_price) params.append("min_price", filters.min_price);
      if (filters.max_price) params.append("max_price", filters.max_price);
      if (filters.delivery_time) params.append("delivery_time", filters.delivery_time);
      if (filters.rating) params.append("rating", filters.rating);
      if (filters.sort) params.append("sort", filters.sort);

      const res = await axiosInstance.get(`/api/services?${params.toString()}`);
      setServices(res.data || []);
    } catch (err) {
      console.error("Failed to load services", err);
      setError("Could not load services. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const applyFilters = () => {
    fetchServices();
  };

  const clearFilters = () => {
    setFilters({
      category: "",
      min_price: "",
      max_price: "",
      delivery_time: "",
      rating: "",
      sort: "recency",
    });
    setTimeout(() => fetchServices(), 100);
  };

  return (
    <Box
      sx={{
        background: `linear-gradient(135deg, ${theme.palette.background.default} 0%, ${theme.palette.mode === 'dark' ? '#1a1a2e' : '#f5f5f5'} 100%)`,
        minHeight: "100vh",
        py: 4,
      }}
    >
      <Container maxWidth="lg">
        <Typography
          variant="h3"
          sx={{
            fontWeight: "800",
            mb: 1,
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Browse Services
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
          Discover talented freelancers and their services
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {/* Filters Card */}
        <Card
          sx={{
            mb: 4,
            boxShadow: theme.shadows[8],
            borderRadius: 2,
            transition: "all 0.3s ease",
          }}
        >
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              Filter Services
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  label="Category"
                  name="category"
                  fullWidth
                  value={filters.category}
                  onChange={handleFilterChange}
                  placeholder="e.g. Design, Writing"
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  label="Min Price ($)"
                  name="min_price"
                  type="number"
                  fullWidth
                  value={filters.min_price}
                  onChange={handleFilterChange}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  label="Max Price ($)"
                  name="max_price"
                  type="number"
                  fullWidth
                  value={filters.max_price}
                  onChange={handleFilterChange}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  label="Delivery (days)"
                  name="delivery_time"
                  type="number"
                  fullWidth
                  value={filters.delivery_time}
                  onChange={handleFilterChange}
                  size="small"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Sort</InputLabel>
                  <Select
                    name="sort"
                    value={filters.sort}
                    onChange={handleFilterChange}
                    label="Sort"
                  >
                    <MenuItem value="recency">Newest</MenuItem>
                    <MenuItem value="price_asc">Price: Low to High</MenuItem>
                    <MenuItem value="price_desc">Price: High to Low</MenuItem>
                    <MenuItem value="rating">Highest Rated</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={1} sx={{ display: "flex", gap: 1 }}>
                <Button
                  fullWidth
                  variant="contained"
                  size="small"
                  startIcon={<SearchIcon />}
                  onClick={applyFilters}
                  sx={{ textTransform: "none" }}
                >
                  Filter
                </Button>
              </Grid>
              <Grid item xs={12} sm={6} md={1}>
                <Button
                  fullWidth
                  variant="outlined"
                  size="small"
                  startIcon={<ClearIcon />}
                  onClick={clearFilters}
                  sx={{ textTransform: "none" }}
                >
                  Clear
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Loading State */}
        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Services Grid */}
        {!loading && (
          <Grid container spacing={3}>
            {services.length > 0 ? (
              services.map((service) => (
                <Grid item xs={12} sm={6} md={4} key={service.service_id}>
                  <Fade in={true} timeout={300}>
                    <Card
                      onClick={() => navigate(`/services/${service.service_id}`)}
                      sx={{
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        cursor: "pointer",
                        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                        borderRadius: 2,
                        "&:hover": {
                          transform: "translateY(-8px)",
                          boxShadow: theme.shadows[16],
                        },
                      }}
                    >
                      <CardMedia
                        sx={{
                          height: 200,
                          backgroundColor: theme.palette.mode === "dark" ? "#2c3e50" : "#ecf0f1",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Typography variant="h6" color="text.secondary">
                          📋 {service.title?.slice(0, 30)}...
                        </Typography>
                      </CardMedia>
                      <CardContent sx={{ flex: 1 }}>
                        <Stack spacing={2}>
                          <div>
                            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                              {service.title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              by <strong>{service.freelancer_name}</strong>
                            </Typography>
                          </div>

                          {service.description && (
                            <Typography variant="body2" color="text.secondary">
                              {service.description.slice(0, 80)}...
                            </Typography>
                          )}

                          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                            {service.category && (
                              <Chip
                                label={service.category}
                                size="small"
                                variant="outlined"
                                color="primary"
                              />
                            )}
                            {service.tags && (
                              <Chip
                                label={service.tags?.split(",")[0]}
                                size="small"
                                variant="outlined"
                              />
                            )}
                          </Stack>

                          <Stack direction="row" spacing={2} sx={{ alignItems: "center", mt: "auto" }}>
                            <div>
                              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                ${service.price || "N/A"}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {service.delivery_time || "N/A"} days delivery
                              </Typography>
                            </div>
                            {service.average_rating && (
                              <Rating
                                value={parseFloat(service.average_rating)}
                                readOnly
                                size="small"
                                sx={{ ml: "auto" }}
                              />
                            )}
                          </Stack>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Fade>
                </Grid>
              ))
            ) : (
              <Grid item xs={12}>
                <Card sx={{ textAlign: "center", py: 6 }}>
                  <Typography variant="h6" color="text.secondary">
                    No services found. Try adjusting your filters.
                  </Typography>
                </Card>
              </Grid>
            )}
          </Grid>
        )}
      </Container>
    </Box>
  );
}
