import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,
} from "@mui/material";
import colors from "../helper/colors";
import { axiosInstance, useAuth } from "../context/Authcontext";

export default function Availability() {
  const { freelancerId } = useParams();
  const { user } = useAuth();
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.get(`/api/availability/${freelancerId}`);
        setSlots(res.data);
      } catch (err) {
        console.error("Failed to load availability", err);
      } finally {
        setLoading(false);
      }
    };

    if (freelancerId) {
      fetchAvailability();
    }
  }, [freelancerId]);

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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
          Loading availability...
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
          <Typography
            variant="h4"
            sx={{
              fontWeight: "bold",
              color: colors.color1,
              mb: 3,
            }}
          >
            Freelancer Availability
          </Typography>

          {slots.length === 0 ? (
            <Typography variant="body1" sx={{ color: colors.color3 }}>
              No availability slots found.
            </Typography>
          ) : (
            <Grid container spacing={2}>
              {slots.map((slot) => (
                <Grid item xs={12} sm={6} md={4} key={slot.slot_id}>
                  <Card
                    sx={{
                      p: 2,
                      backgroundColor: slot.is_booked ? colors.color3 : colors.color4,
                      borderRadius: 2,
                      border: slot.is_booked ? "none" : `2px solid ${colors.color2}`,
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: "bold",
                        color: slot.is_booked ? colors.color5 : colors.color1,
                        mb: 1,
                      }}
                    >
                      {formatDate(slot.start_time)}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: slot.is_booked ? colors.color5 : colors.color3 }}
                    >
                      to {formatDate(slot.end_time)}
                    </Typography>
                    <Box mt={1}>
                      <Chip
                        label={slot.is_booked ? "Booked" : "Available"}
                        sx={{
                          backgroundColor: slot.is_booked ? colors.color1 : colors.color2,
                          color: colors.color5,
                          fontWeight: "bold",
                        }}
                      />
                    </Box>
                    {slot.is_booked && slot.booked_by_order_id && (
                      <Typography
                        variant="caption"
                        sx={{ color: colors.color5, mt: 1, display: "block" }}
                      >
                        Order #{slot.booked_by_order_id}
                      </Typography>
                    )}
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          <Button
            variant="outlined"
            sx={{
              mt: 3,
              color: colors.color1,
              borderColor: colors.color1,
              fontWeight: "bold",
              "&:hover": { backgroundColor: colors.color4 },
            }}
            onClick={() => window.history.back()}
          >
            Back
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
