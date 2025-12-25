import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Divider,
  Chip,
  Alert,
} from "@mui/material";
import colors from "../helper/colors";
import { axiosInstance, useAuth } from "../context/Authcontext";

export default function Warranty() {
  const { orderId } = useParams();
  const { user } = useAuth();
  const [warranty, setWarranty] = useState(null);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claimDescription, setClaimDescription] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const fetchWarranty = async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.get(`/api/warranty/${orderId}`);
        setWarranty(res.data.warranty);
        setClaims(res.data.claims || []);
      } catch (err) {
        console.error("Failed to load warranty", err);
        setError(err.response?.data?.detail || "No warranty found for this order");
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchWarranty();
    }
  }, [orderId]);

  const handleFileClaim = async () => {
    if (!claimDescription.trim()) {
      setError("Please provide a claim description");
      return;
    }

    try {
      setError("");
      setSuccess("");
      await axiosInstance.post(`/api/warranty/${orderId}/claim`, {
        description: claimDescription,
      });
      setSuccess("Claim filed successfully");
      setClaimDescription("");
      // Refresh claims
      const res = await axiosInstance.get(`/api/warranty/${orderId}`);
      setClaims(res.data.claims || []);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to file claim");
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
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
          Loading warranty information...
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
          maxWidth: 800,
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
            Service Warranty
          </Typography>

          {error && !warranty && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {warranty && (
            <>
              <Box mb={3}>
                <Typography variant="h6" sx={{ fontWeight: "bold", color: colors.color1, mb: 1 }}>
                  Warranty Details
                </Typography>
                <Typography variant="body2" sx={{ color: colors.color3, mb: 0.5 }}>
                  Duration: {warranty.duration_days} days
                </Typography>
                <Typography variant="body2" sx={{ color: colors.color3, mb: 0.5 }}>
                  Valid From: {formatDate(warranty.issued_date)}
                </Typography>
                <Typography variant="body2" sx={{ color: colors.color3, mb: 0.5 }}>
                  Valid Until: {formatDate(warranty.expiry_date)}
                </Typography>
                <Typography variant="body2" sx={{ color: colors.color3, mb: 0.5 }}>
                  Terms: {warranty.terms || "Standard warranty terms apply"}
                </Typography>
                <Chip
                  label={new Date(warranty.expiry_date) > new Date() ? "Active" : "Expired"}
                  sx={{
                    mt: 1,
                    backgroundColor: new Date(warranty.expiry_date) > new Date() ? colors.color2 : colors.color3,
                    color: colors.color5,
                    fontWeight: "bold",
                  }}
                />
              </Box>

              <Divider sx={{ my: 3 }} />

              {/* File Claim Section */}
              {user?.role === 'client' && new Date(warranty.expiry_date) > new Date() && (
                <Box mb={3}>
                  <Typography variant="h6" sx={{ fontWeight: "bold", color: colors.color1, mb: 2 }}>
                    File a Claim
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    variant="outlined"
                    label="Describe your issue"
                    value={claimDescription}
                    onChange={(e) => setClaimDescription(e.target.value)}
                    sx={{ mb: 2 }}
                  />
                  <Button
                    variant="contained"
                    sx={{
                      background: `linear-gradient(90deg, ${colors.color2}, ${colors.color1})`,
                      fontWeight: "bold",
                      "&:hover": {
                        background: `linear-gradient(90deg, ${colors.color1}, ${colors.color2})`,
                      },
                    }}
                    onClick={handleFileClaim}
                  >
                    Submit Claim
                  </Button>
                  {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
                  {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}
                </Box>
              )}

              {/* Claims History */}
              {claims.length > 0 && (
                <>
                  <Divider sx={{ my: 3 }} />
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: "bold", color: colors.color1, mb: 2 }}>
                      Claims History ({claims.length})
                    </Typography>
                    {claims.map((claim) => (
                      <Card
                        key={claim.claim_id}
                        sx={{
                          mb: 2,
                          p: 2,
                          backgroundColor: colors.color4,
                          borderRadius: 2,
                        }}
                      >
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                          <Chip
                            label={claim.status}
                            sx={{
                              backgroundColor: 
                                claim.status === 'approved' ? colors.color2 :
                                claim.status === 'rejected' ? colors.color1 :
                                colors.color3,
                              color: colors.color5,
                              fontWeight: "bold",
                            }}
                          />
                          <Typography variant="caption" sx={{ color: colors.color3 }}>
                            Filed: {formatDate(claim.claim_date)}
                          </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ color: colors.color1, mb: 1 }}>
                          {claim.description}
                        </Typography>
                        {claim.resolution && (
                          <Typography variant="body2" sx={{ color: colors.color3, fontStyle: "italic" }}>
                            Resolution: {claim.resolution}
                          </Typography>
                        )}
                      </Card>
                    ))}
                  </Box>
                </>
              )}
            </>
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
