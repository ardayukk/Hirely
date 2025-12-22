import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  Typography,
  Fade,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import colors from "../helper/colors";
import { axiosInstance } from "../context/Authcontext";
import { useAuth } from "../context/Authcontext";

export default function ServiceDetail() {
  const { serviceId } = useParams();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [openAddOn, setOpenAddOn] = useState(false);
  const [addonData, setAddonData] = useState({ title: '', description: '', delivery_time: 1, hourly_price: 0.0 });

  useEffect(() => {
    const fetchServiceDetail = async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.get(`/api/services/${serviceId}`);
        setService(res.data);
      } catch (err) {
        console.error("Failed to load service details", err);
      } finally {
        setLoading(false);
      }
    };

    fetchServiceDetail();
  }, [serviceId]);

  if (loading) {
    return (
      <Box
        sx={{
          background: `linear-gradient(135deg, ${colors.color4}, ${colors.color5})`,
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Typography variant="h6" sx={{ color: colors.color1 }}>
          Loading service details...
        </Typography>
      </Box>
    );
  }

  if (!service) {
    return (
      <Box
        sx={{
          background: `linear-gradient(135deg, ${colors.color4}, ${colors.color5})`,
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Typography variant="h6" sx={{ color: colors.color1 }}>
          Service not found.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        background: `linear-gradient(135deg, ${colors.color4}, ${colors.color5})`,
        minHeight: "100vh",
        p: 3,
      }}
    >
      <Fade in timeout={500}>
        <Card
          sx={{
            maxWidth: 1000,
            mx: "auto",
            backgroundColor: colors.color5,
            borderRadius: 4,
            boxShadow: `0 8px 30px ${colors.color3}`,
          }}
        >
          <CardContent sx={{ p: 4 }}>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: "bold",
                  color: colors.color1,
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
                  fontSize: 14,
                }}
              />
            </Box>

            {/* Description */}
            <Typography variant="body1" sx={{ color: colors.color1, mb: 3 }}>
              {service.description || "No description provided."}
            </Typography>

            {/* Service Info */}
            <Grid container spacing={2} mb={3}>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" sx={{ color: colors.color3 }}>
                  Price
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: "bold", color: colors.color1 }}>
                  ${service.hourly_price ? service.hourly_price.toFixed(2) : "N/A"}/hr
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" sx={{ color: colors.color3 }}>
                  Delivery Time
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: "bold", color: colors.color1 }}>
                  {service.delivery_time ? `${service.delivery_time} days` : "N/A"}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" sx={{ color: colors.color3 }}>
                  Rating
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: "bold", color: colors.color1 }}>
                  ★ {service.average_rating.toFixed(1)}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" sx={{ color: colors.color3 }}>
                  Status
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: "bold", color: colors.color1 }}>
                  {service.status}
                </Typography>
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            {/* Freelancer Info */}
            <Box mb={3}>
              <Typography variant="h6" sx={{ fontWeight: "bold", color: colors.color1, mb: 2 }}>
                Freelancer
              </Typography>
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar
                  sx={{
                    bgcolor: colors.color2,
                    width: 60,
                    height: 60,
                    fontSize: 24,
                    fontWeight: "bold",
                  }}
                >
                  {service.freelancer.username ? service.freelancer.username.charAt(0).toUpperCase() : "F"}
                </Avatar>
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: "bold", color: colors.color1 }}>
                    {service.freelancer.username}
                  </Typography>
                  <Typography variant="body2" sx={{ color: colors.color3 }}>
                    {service.freelancer.tagline || "No tagline"}
                  </Typography>
                  <Typography variant="caption" sx={{ color: colors.color3 }}>
                    ★ {service.freelancer.avg_rating.toFixed(1)} | {service.freelancer.total_orders} orders | {service.freelancer.total_reviews} reviews
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Sample Work */}
            {service.sample_work && (
              <>
                <Divider sx={{ my: 3 }} />
                <Box mb={3}>
                  <Typography variant="h6" sx={{ fontWeight: "bold", color: colors.color1, mb: 2 }}>
                    Sample Work
                  </Typography>
                  <Typography variant="body2" sx={{ color: colors.color1 }}>
                    {service.sample_work}
                  </Typography>
                </Box>
              </>
            )}

            {/* Reviews */}
            {service.reviews.length > 0 && (
              <>
                <Divider sx={{ my: 3 }} />
                <Box mb={3}>
                  <Typography variant="h6" sx={{ fontWeight: "bold", color: colors.color1, mb: 2 }}>
                    Reviews ({service.reviews.length})
                  </Typography>
                  {service.reviews.map((review) => (
                    <Card
                      key={review.review_id}
                      sx={{
                        mb: 2,
                        p: 2,
                        backgroundColor: colors.color4,
                        borderRadius: 2,
                      }}
                    >
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <Chip
                          label={`★ ${review.rating}`}
                          sx={{
                            backgroundColor: colors.color2,
                            color: colors.color5,
                            fontWeight: "bold",
                          }}
                        />
                        <Typography variant="caption" sx={{ color: colors.color3 }}>
                          Client ID: {review.client_id}
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ color: colors.color1 }}>
                        {review.comment || "No comment provided."}
                      </Typography>
                    </Card>
                  ))}
                </Box>
              </>
            )}

            {/* Add-ons */}
            {service.addons.length > 0 && (
              <>
                <Divider sx={{ my: 3 }} />
                <Box mb={3}>
                  <Typography variant="h6" sx={{ fontWeight: "bold", color: colors.color1, mb: 2 }}>
                    Add-ons ({service.addons.length})
                  </Typography>
                  <Grid container spacing={2}>
                    {service.addons.map((addon) => (
                      <Grid item xs={12} sm={6} key={addon.service_id}>
                        <Card
                          sx={{
                            p: 2,
                            backgroundColor: colors.color4,
                            borderRadius: 2,
                            cursor: "pointer",
                            "&:hover": {
                              boxShadow: `0 4px 15px ${colors.color3}`,
                            },
                          }}
                          onClick={() => (window.location.href = `/services/${addon.service_id}`)}
                        >
                          <Typography variant="body1" sx={{ fontWeight: "bold", color: colors.color1 }}>
                            {addon.title}
                          </Typography>
                          <Typography variant="body2" sx={{ color: colors.color3 }}>
                            ${addon.hourly_price ? addon.hourly_price.toFixed(2) : "N/A"}/hr | ★ {addon.average_rating.toFixed(1)}
                          </Typography>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </>
            )}

            {/* Action Buttons */}
            <Box display="flex" gap={2} mt={4}>
              <Button
                variant="contained"
                fullWidth
                sx={{
                  py: 1.5,
                  background: `linear-gradient(90deg, ${colors.color2}, ${colors.color1})`,
                  fontWeight: "bold",
                  fontSize: 16,
                  "&:hover": {
                    background: `linear-gradient(90deg, ${colors.color1}, ${colors.color2})`,
                  },
                }}
                onClick={() => (window.location.href = `/checkout/${service.service_id}`)}
              >
                Order Now
              </Button>
              <Button
                variant="outlined"
                sx={{
                  py: 1.5,
                  px: 3,
                  color: colors.color1,
                  borderColor: colors.color1,
                  fontWeight: "bold",
                  "&:hover": {
                    backgroundColor: colors.color4,
                  },
                }}
                onClick={() => window.history.back()}
              >
                Back
              </Button>
              {user && user.role === 'freelancer' && service.freelancer.user_id === user.id && (
                <>
                  <Button
                    variant="outlined"
                    sx={{
                      py: 1.5,
                      px: 3,
                      color: colors.color1,
                      borderColor: colors.color1,
                      fontWeight: "bold",
                      "&:hover": {
                        backgroundColor: colors.color4,
                      },
                    }}
                    onClick={() => setOpenAddOn(true)}
                  >
                    Create Add-on
                  </Button>
                  <Button
                    variant="outlined"
                    sx={{
                      py: 1.5,
                      px: 3,
                      color: '#d32f2f',
                      borderColor: '#d32f2f',
                      fontWeight: "bold",
                      "&:hover": {
                        backgroundColor: '#ffebee',
                      },
                    }}
                    onClick={async () => {
                      if (!window.confirm('Are you sure you want to delete this service?')) return;
                      try {
                        await axiosInstance.delete(`/api/services/${serviceId}?freelancer_id=${user.id}`);
                        alert('Service deleted successfully');
                        window.location.href = '/services';
                      } catch (err) {
                        alert(err.response?.data?.detail || 'Failed to delete service');
                      }
                    }}
                  >
                    Delete
                  </Button>
                </>
              )}
            </Box>
            {/* Add-on Creation Dialog */}
            <Dialog open={openAddOn} onClose={() => setOpenAddOn(false)}>
              <DialogTitle>Create Add-on</DialogTitle>
              <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1, minWidth: 400 }}>
                  <TextField label="Title" value={addonData.title} onChange={(e) => setAddonData({ ...addonData, title: e.target.value })} />
                  <TextField label="Description" multiline minRows={3} value={addonData.description} onChange={(e) => setAddonData({ ...addonData, description: e.target.value })} />
                  <TextField label="Delivery Time (days)" type="number" value={addonData.delivery_time} onChange={(e) => setAddonData({ ...addonData, delivery_time: e.target.value })} />
                  <TextField label="Price (hourly)" type="number" value={addonData.hourly_price} onChange={(e) => setAddonData({ ...addonData, hourly_price: e.target.value })} />
                </Box>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setOpenAddOn(false)}>Cancel</Button>
                <Button onClick={async () => {
                  // create addon service then link it
                  if (!user) { alert('You must be logged in'); return; }
                  try {
                    setLoading(true);
                    const createPayload = {
                      title: addonData.title,
                      category: 'Add-on',
                      description: addonData.description,
                      delivery_time: Number(addonData.delivery_time),
                      hourly_price: Number(addonData.hourly_price),
                      package_tier: 'addon',
                    };
                    const createRes = await axiosInstance.post(`/api/services?freelancer_id=${user.id}`, createPayload);
                    const addonId = createRes.data.service_id;
                    await axiosInstance.post(`/api/services/${serviceId}/addons?freelancer_id=${user.id}`, { addon_service_id: addonId });
                    const res = await axiosInstance.get(`/api/services/${serviceId}`);
                    setService(res.data);
                    setOpenAddOn(false);
                    setAddonData({ title: '', description: '', delivery_time: 1, hourly_price: 0.0 });
                    alert('Add-on created and linked');
                  } catch (err) {
                    console.error(err);
                    alert(err.response?.data?.detail || 'Failed to create add-on');
                  } finally { setLoading(false); }
                }}>Create</Button>
              </DialogActions>
            </Dialog>
          </CardContent>
        </Card>
      </Fade>
    </Box>
  );
}
