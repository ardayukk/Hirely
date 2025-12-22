import React, { useState } from "react";
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
  const [addons, setAddons] = useState([]);

  const addAddonRow = () => setAddons((a) => [...a, { title: '', description: '', delivery_time: 1, hourly_price: 0.0 }]);
  const removeAddonRow = (index) => setAddons((a) => a.filter((_, i) => i !== index));
  const handleAddonChange = (index, field, value) => {
    setAddons((a) => a.map((ad, i) => (i === index ? { ...ad, [field]: value } : ad)));
  };

  const handleChange = (e) => {
    setService({ ...service, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user?.id) {
      alert("You must be logged in as a freelancer to create a service.");
      return;
    }

    if (user.role !== "freelancer") {
      alert("Only freelancers can create services.");
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
      const createdService = res.data;

      // create and link addons if any
      if (addons.length > 0) {
        for (const ad of addons) {
          try {
            const addonPayload = {
              title: ad.title,
              category: 'Add-on',
              description: ad.description || null,
              delivery_time: ad.delivery_time ? parseInt(ad.delivery_time) : null,
              hourly_price: ad.hourly_price ? parseFloat(ad.hourly_price) : null,
              package_tier: 'addon',
            };
            const createAddonRes = await axiosInstance.post(`/api/services?freelancer_id=${user.id}`, addonPayload);
            const addonId = createAddonRes.data.service_id;
            await axiosInstance.post(`/api/services/${createdService.service_id}/addons?freelancer_id=${user.id}`, { addon_service_id: addonId });
          } catch (err) {
            console.error('Failed to create/link addon', err);
          }
        }
      }

      alert(`Service "${createdService.title}" created successfully!`);
      setService({
        title: "",
        category: "",
        description: "",
        delivery_time: "",
        hourly_price: "",
        package_tier: "",
        sample_work: "",
      });
      setAddons([]);
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
                {user?.role === 'freelancer' && (
                  <Grid item xs={12}>
                    <Typography variant="h6" sx={{ color: colors.color1, mb: 1 }}>Add-ons (optional)</Typography>
                    {addons.map((ad, idx) => (
                      <Card key={idx} sx={{ mb: 2, backgroundColor: colors.color4, p: 2 }}>
                        <Grid container spacing={1} alignItems="center">
                          <Grid item xs={12} sm={6}>
                            <TextField label="Title" fullWidth value={ad.title} onChange={(e) => handleAddonChange(idx, 'title', e.target.value)} />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField label="Price ($)" type="number" fullWidth value={ad.hourly_price} onChange={(e) => handleAddonChange(idx, 'hourly_price', e.target.value)} />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField label="Delivery Time (days)" type="number" fullWidth value={ad.delivery_time} onChange={(e) => handleAddonChange(idx, 'delivery_time', e.target.value)} />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <Button variant="outlined" color="error" onClick={() => removeAddonRow(idx)}>Remove</Button>
                          </Grid>
                          <Grid item xs={12}>
                            <TextField label="Description" fullWidth multiline rows={2} value={ad.description} onChange={(e) => handleAddonChange(idx, 'description', e.target.value)} />
                          </Grid>
                        </Grid>
                      </Card>
                    ))}
                    <Box mt={1}>
                      <Button variant="contained" onClick={addAddonRow}>Add Add-on</Button>
                    </Box>
                  </Grid>
                )}
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
