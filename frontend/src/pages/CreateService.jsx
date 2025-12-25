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
  const [addons, setAddons] = useState([]);
  const [newAddon, setNewAddon] = useState({
    title: "",
    description: "",
    price: "",
    delivery_time_extension: "",
  });

  const handleChange = (e) => {
    setService({ ...service, [e.target.name]: e.target.value });
  };

  const handleAddonChange = (e) => {
    setNewAddon({ ...newAddon, [e.target.name]: e.target.value });
  };

  const addAddon = () => {
    if (!newAddon.title || !newAddon.price) {
      alert("Add-on title and price are required.");
      return;
    }
    setAddons([...addons, newAddon]);
    setNewAddon({ title: "", description: "", price: "", delivery_time_extension: "" });
  };

  const removeAddon = (index) => {
    setAddons(addons.filter((_, i) => i !== index));
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
        addons: addons.map(a => ({
          title: a.title,
          description: a.description || null,
          price: parseFloat(a.price),
          delivery_time_extension: a.delivery_time_extension ? parseInt(a.delivery_time_extension) : 0
        }))
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

                {/* Add-ons Section */}
                <Grid item xs={12}>
                  <Typography variant="h6" sx={{ mt: 2, mb: 1, color: colors.color1 }}>
                    Service Add-ons (Optional)
                  </Typography>
                  <Box sx={{ border: `1px solid ${colors.color3}`, borderRadius: 2, p: 2, mb: 2 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Add-on Title"
                          name="title"
                          fullWidth
                          value={newAddon.title}
                          onChange={handleAddonChange}
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        <TextField
                          label="Price ($)"
                          name="price"
                          type="number"
                          fullWidth
                          value={newAddon.price}
                          onChange={handleAddonChange}
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        <TextField
                          label="Extra Days"
                          name="delivery_time_extension"
                          type="number"
                          fullWidth
                          value={newAddon.delivery_time_extension}
                          onChange={handleAddonChange}
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          label="Description"
                          name="description"
                          fullWidth
                          value={newAddon.description}
                          onChange={handleAddonChange}
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <Button variant="outlined" onClick={addAddon} fullWidth>
                          Add Add-on
                        </Button>
                      </Grid>
                    </Grid>
                  </Box>

                  {/* List of added add-ons */}
                  {addons.map((addon, index) => (
                    <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, p: 1, bgcolor: colors.color4, borderRadius: 1 }}>
                      <Typography variant="body2">
                        {addon.title} - ${addon.price} (+{addon.delivery_time_extension} days)
                      </Typography>
                      <Button size="small" color="error" onClick={() => removeAddon(index)}>
                        Remove
                      </Button>
                    </Box>
                  ))}
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
