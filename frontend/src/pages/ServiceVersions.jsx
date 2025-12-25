import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
} from "@mui/material";
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
} from "@mui/lab";
import colors from "../helper/colors";
import { axiosInstance } from "../context/Authcontext";

export default function ServiceVersions() {
  const { serviceId } = useParams();
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVersions = async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.get(`/api/services/${serviceId}/versions`);
        setVersions(res.data);
      } catch (err) {
        console.error("Failed to load service versions", err);
      } finally {
        setLoading(false);
      }
    };

    if (serviceId) {
      fetchVersions();
    }
  }, [serviceId]);

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
          Loading service versions...
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
            Service Version History
          </Typography>

          {versions.length === 0 ? (
            <Typography variant="body1" sx={{ color: colors.color3 }}>
              No version history available for this service.
            </Typography>
          ) : (
            <Timeline position="alternate">
              {versions.map((version, index) => (
                <TimelineItem key={version.version_id}>
                  <TimelineSeparator>
                    <TimelineDot
                      sx={{
                        backgroundColor: index === 0 ? colors.color2 : colors.color3,
                        boxShadow: `0 0 0 4px ${colors.color5}`,
                      }}
                    >
                      <Typography variant="body2" sx={{ color: colors.color5, fontWeight: "bold" }}>
                        v{version.version_number}
                      </Typography>
                    </TimelineDot>
                    {index < versions.length - 1 && <TimelineConnector sx={{ backgroundColor: colors.color3 }} />}
                  </TimelineSeparator>
                  <TimelineContent sx={{ p: 2 }}>
                    <Card
                      sx={{
                        backgroundColor: colors.color4,
                        borderRadius: 2,
                        border: index === 0 ? `2px solid ${colors.color2}` : `1px solid ${colors.color3}`,
                      }}
                    >
                      <Box sx={{ p: 2 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                          <Typography variant="h6" sx={{ fontWeight: "bold", color: colors.color1 }}>
                            Version {version.version_number}
                            {index === 0 && (
                              <Typography
                                component="span"
                                variant="caption"
                                sx={{
                                  ml: 1,
                                  backgroundColor: colors.color2,
                                  color: colors.color5,
                                  px: 1,
                                  py: 0.5,
                                  borderRadius: 1,
                                  fontWeight: "bold",
                                }}
                              >
                                Current
                              </Typography>
                            )}
                          </Typography>
                          <Typography variant="caption" sx={{ color: colors.color3 }}>
                            {formatDate(version.created_at)}
                          </Typography>
                        </Box>

                        {version.features && (
                          <>
                            <Typography variant="body2" sx={{ color: colors.color3, mb: 1, fontWeight: "bold" }}>
                              Features:
                            </Typography>
                            <Typography variant="body2" sx={{ color: colors.color1, pl: 2, mb: 2 }}>
                              {version.features}
                            </Typography>
                          </>
                        )}

                        {version.change_description && (
                          <>
                            <Typography variant="body2" sx={{ color: colors.color3, mb: 1, fontWeight: "bold" }}>
                              What's New:
                            </Typography>
                            <Typography variant="body2" sx={{ color: colors.color1, pl: 2 }}>
                              {version.change_description}
                            </Typography>
                          </>
                        )}
                      </Box>
                    </Card>
                  </TimelineContent>
                </TimelineItem>
              ))}
            </Timeline>
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
