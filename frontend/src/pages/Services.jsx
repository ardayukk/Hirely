import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
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
} from "@mui/material";
import colors from "../helper/colors";
import { axiosInstance } from "../context/Authcontext";

export default function Services() {
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
        background: `linear-gradient(135deg, ${colors.color4}, ${colors.color5})`,
        minHeight: "100vh",
        p: 3,
      }}
    >
      <Typography
        variant="h4"
        sx={{
          fontWeight: "bold",
          color: colors.color1,
          mb: 3,
          textAlign: "center",
        }}
      >
        Browse Services
      </Typography>

      {/* Filters */}
      <Card
        sx={{
          mb: 3,
          backgroundColor: colors.color5,
          boxShadow: `0 4px 15px ${colors.color3}`,
          borderRadius: 3,
        }}
      >
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                label="Category"
                name="category"
                fullWidth
                value={filters.category}
                onChange={handleFilterChange}
                placeholder="e.g. Design, Writing"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                label="Min Price"
                name="min_price"
                type="number"
                fullWidth
                value={filters.min_price}
                onChange={handleFilterChange}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                label="Max Price"
                name="max_price"
                type="number"
                fullWidth
                value={filters.max_price}
                onChange={handleFilterChange}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                label="Delivery Time (days)"
                name="delivery_time"
                type="number"
                fullWidth
                value={filters.delivery_time}
                onChange={handleFilterChange}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                label="Min Rating"
                name="rating"
                type="number"
                inputProps={{ step: 0.1, min: 0, max: 5 }}
                fullWidth
                value={filters.rating}
                onChange={handleFilterChange}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Sort By</InputLabel>
                <Select
                  name="sort"
                  value={filters.sort}
                  onChange={handleFilterChange}
                  label="Sort By"
                >
                  <MenuItem value="recency">Most Recent</MenuItem>
                  <MenuItem value="popularity">Most Popular</MenuItem>
                  <MenuItem value="reviews">Highest Rated</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                variant="contained"
                fullWidth
                sx={{
                  height: "100%",
                  background: `linear-gradient(90deg, ${colors.color2}, ${colors.color1})`,
                  fontWeight: "bold",
                  "&:hover": {
                    background: `linear-gradient(90deg, ${colors.color1}, ${colors.color2})`,
                  },
                }}
                onClick={applyFilters}
              >
                Apply Filters
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Button
                variant="outlined"
                fullWidth
                sx={{
                  height: "100%",
                  color: colors.color1,
                  borderColor: colors.color1,
                }}
                onClick={clearFilters}
              >
                Clear
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Service Cards */}
      {loading && (
        <Typography variant="body1" sx={{ color: colors.color1, textAlign: "center" }}>
          Loading services...
        </Typography>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && !error && services.length === 0 && (
        <Typography variant="body1" sx={{ color: colors.color1, textAlign: "center" }}>
          No services found. Try adjusting your filters.
        </Typography>
      )}

      <Grid container spacing={3}>
        {services.map((service) => {
          const price = Number(service.hourly_price ?? 0);
          const rating = Number(service.average_rating ?? 0);

          return (
            <Grid item xs={12} sm={6} md={4} key={service.service_id}>
              <Fade in timeout={400}>
                <Card
                  sx={{
                    backgroundColor: colors.color5,
                    borderRadius: 3,
                    boxShadow: `0 4px 15px ${colors.color3}`,
                    transition: "all 0.3s",
                    "&:hover": {
                      transform: "translateY(-4px)",
                      boxShadow: `0 8px 25px ${colors.color3}`,
                    },
                    cursor: "pointer",
                  }}
                  onClick={() => (window.location.href = `/services/${service.service_id}`)}
                >
                  <CardContent>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: "bold",
                        color: colors.color1,
                        mb: 1,
                      }}
                    >
                      {service.title}
                    </Typography>

                    <Chip
                      label={service.category}
                      sx={{
                        backgroundColor: colors.color3,
                        color: colors.color6,
                        fontWeight: "bold",
                        mb: 2,
                      }}
                    />

                  <Typography
                    variant="body2"
                    sx={{
                      color: colors.color1,
                      mb: 2,
                      minHeight: 60,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {service.description || "No description available."}
                  </Typography>

                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" sx={{ color: colors.color1, fontWeight: "bold" }}>
                      {Number.isFinite(price) ? `$${price.toFixed(2)}/hr` : "N/A"}
                    </Typography>
                    <Chip
                      label={`★ ${Number.isFinite(rating) ? rating.toFixed(1) : "0.0"}`}
                      sx={{
                        backgroundColor: colors.color2,
                        color: colors.color5,
                        fontWeight: "bold",
                      }}
                    />
                  </Box>

                  {service.delivery_time && (
                    <Typography variant="caption" sx={{ color: colors.color3, mt: 1, display: "block" }}>
                      Delivery: {service.delivery_time} days
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Fade>
          </Grid>
        );
        })}
      </Grid>
    </Box>
  );
}
