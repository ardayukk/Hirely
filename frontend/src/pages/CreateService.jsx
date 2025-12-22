import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  Typography,
  Fade,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import colors from "../helper/colors";
import { useAuth, axiosInstance } from "../context/Authcontext";

export default function CreateService() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [service, setService] = useState({
    title: "",
    category: "",
    description: "",
    delivery_time: "",
    hourly_price: "",
    package_tier: "",
    sample_work: "",
  });

  const handleChange = (e) => {
    setService({ ...service, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user?.id) {
      alert("You must be logged in to create a service.");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        title: service.title,
        category: service.category,
        description: service.description || null,
        delivery_time: service.delivery_time ? parseInt(service.delivery_time) : null,
        hourly_price: service.hourly_price ? parseFloat(service.hourly_price) : null,
        package_tier: service.package_tier || null,
        sample_work: service.sample_work || null,
      };

      const res = await axiosInstance.post(`/api/services?freelancer_id=${user.id}`, payload);

      alert(`Service "${res.data.title}" created successfully!`);
      navigate(`/services/${res.data.service_id}`);
    } catch (err) {
      console.error("Failed to create service", err);
      alert(err.response?.data?.detail || "Failed to create service. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        background: `linear-gradient(135deg, ${colors.color4}, ${colors.color5})`,
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        p: 2,
      }}
    >
      <Fade in timeout={600}>
        <Card
          sx={{
            width: 600,
            borderRadius: 5,
            backgroundColor: colors.color5,
            boxShadow: `0 8px 30px ${colors.color3}`,
          }}
        >
          <CardContent sx={{ p: 5 }}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: "bold",
                textAlign: "center",
                color: colors.color1,
                mb: 3,
              }}
            >
              Create New Service
            </Typography>

            <form onSubmit={handleSubmit}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    label="Service Title"
                    name="title"
                    fullWidth
                    required
                    value={service.title}
                    onChange={handleChange}
                    InputProps={{
                      style: {
                        backgroundColor: colors.color5,
                        borderRadius: 6,
                        color: colors.color1,
                      },
                    }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    label="Category"
                    name="category"
                    fullWidth
                    required
                    value={service.category}
                    onChange={handleChange}
                    placeholder="e.g. Design, Writing, Development"
                    InputProps={{
                      style: {
                        backgroundColor: colors.color5,
                        borderRadius: 6,
                        color: colors.color1,
                      },
                    }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    label="Description"
                    name="description"
                    fullWidth
                    multiline
                    rows={4}
                    value={service.description}
                    onChange={handleChange}
                    InputProps={{
                      style: {
                        backgroundColor: colors.color5,
                        borderRadius: 6,
                        color: colors.color1,
                      },
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Hourly Price ($)"
                    name="hourly_price"
                    type="number"
                    fullWidth
                    value={service.hourly_price}
                    onChange={handleChange}
                    inputProps={{ step: 0.01, min: 0 }}
                    InputProps={{
                      style: {
                        backgroundColor: colors.color5,
                        borderRadius: 6,
                        color: colors.color1,
                      },
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Delivery Time (days)"
                    name="delivery_time"
                    type="number"
                    fullWidth
                    value={service.delivery_time}
                    onChange={handleChange}
                    inputProps={{ min: 1 }}
                    InputProps={{
                      style: {
                        backgroundColor: colors.color5,
                        borderRadius: 6,
                        color: colors.color1,
                      },
                    }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Package Tier</InputLabel>
                    <Select
                      name="package_tier"
                      value={service.package_tier}
                      onChange={handleChange}
                      label="Package Tier"
                    >
                      <MenuItem value="">None</MenuItem>
                      <MenuItem value="basic">Basic</MenuItem>
                      <MenuItem value="standard">Standard</MenuItem>
                      <MenuItem value="premium">Premium</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    label="Sample Work (optional)"
                    name="sample_work"
                    fullWidth
                    multiline
                    rows={3}
                    value={service.sample_work}
                    onChange={handleChange}
                    placeholder="Describe or link to sample work"
                    InputProps={{
                      style: {
                        backgroundColor: colors.color5,
                        borderRadius: 6,
                        color: colors.color1,
                      },
                    }}
                  />
                </Grid>
              </Grid>

              <Box textAlign="center" mt={4}>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                  sx={{
                    px: 5,
                    py: 1.5,
                    background: `linear-gradient(90deg, ${colors.color2}, ${colors.color1})`,
                    fontWeight: "bold",
                    fontSize: 16,
                    borderRadius: "2rem",
                    textTransform: "none",
                    color: colors.color5,
                    "&:hover": {
                      background: `linear-gradient(90deg, ${colors.color1}, ${colors.color2})`,
                      transform: "scale(1.05)",
                    },
                  }}
                >
                  {loading ? "Creating..." : "Create Service"}
                </Button>
              </Box>
            </form>
          </CardContent>
        </Card>
      </Fade>
    </Box>
  );
}
