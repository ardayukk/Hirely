import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Typography,
  Fade,
  Alert,
} from "@mui/material";
import colors from "../helper/colors";
import { axiosInstance, useAuth } from "../context/Authcontext";

export default function MyServices() {
  const { user } = useAuth();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user?.id) {
      fetchMyServices();
    }
  }, [user]);

  const fetchMyServices = async () => {
    try {
      setError("");
      setLoading(true);

      // Get all services
      const res = await axiosInstance.get("/api/services");
      const allServices = res.data || [];

      // Filter client-side for services created by this freelancer
      // We'll check the create_service table via a dedicated query
      const myServicesRes = await axiosInstance.get(`/api/services/freelancer/${user.id}`);
      setServices(myServicesRes.data || []);
    } catch (err) {
      console.error("Failed to load my services", err);
      setError("Could not load your services. Please try again.");
    } finally {
      setLoading(false);
    }
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
        My Services
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading && (
        <Typography variant="body1" sx={{ color: colors.color1, textAlign: "center" }}>
          Loading your services...
        </Typography>
      )}

      {!loading && !error && services.length === 0 && (
        <Box sx={{ textAlign: "center", mt: 4 }}>
          <Typography variant="body1" sx={{ color: colors.color1, mb: 2 }}>
            You haven't created any services yet.
          </Typography>
          <Button
            variant="contained"
            onClick={() => (window.location.href = "/create-service")}
            sx={{
              background: `linear-gradient(90deg, ${colors.color2}, ${colors.color1})`,
              fontWeight: "bold",
            }}
          >
            Create Your First Service
          </Button>
        </Box>
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

                    <Chip
                      label={service.status || "active"}
                      size="small"
                      sx={{
                        mt: 1,
                        backgroundColor: service.status === "active" ? colors.color3 : colors.color2,
                        color: colors.color6,
                      }}
                    />
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
