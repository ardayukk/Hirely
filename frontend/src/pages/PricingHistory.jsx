import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from "@mui/material";
import colors from "../helper/colors";
import { axiosInstance } from "../context/Authcontext";

export default function PricingHistory() {
  const { serviceId } = useParams();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPrice, setCurrentPrice] = useState(null);

  useEffect(() => {
    const fetchPricingHistory = async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.get(`/api/pricing-history/${serviceId}`);
        setHistory(res.data);
        if (res.data.length > 0) {
          setCurrentPrice(res.data[0].price);
        }
      } catch (err) {
        console.error("Failed to load pricing history", err);
      } finally {
        setLoading(false);
      }
    };

    if (serviceId) {
      fetchPricingHistory();
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

  const getReasonColor = (reason) => {
    if (reason?.includes("demand")) return colors.color2;
    if (reason?.includes("discount")) return colors.color3;
    return colors.color1;
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
          Loading pricing history...
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
            Pricing History
          </Typography>

          {currentPrice && (
            <Box
              sx={{
                p: 2,
                backgroundColor: colors.color4,
                borderRadius: 2,
                mb: 3,
                border: `2px solid ${colors.color2}`,
              }}
            >
              <Typography variant="body2" sx={{ color: colors.color3, mb: 1 }}>
                Current Price
              </Typography>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: "bold",
                  color: colors.color2,
                }}
              >
                ${currentPrice.toFixed(2)}
              </Typography>
            </Box>
          )}

          {history.length === 0 ? (
            <Typography variant="body1" sx={{ color: colors.color3 }}>
              No pricing history available.
            </Typography>
          ) : (
            <TableContainer component={Card} sx={{ backgroundColor: colors.color4 }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: colors.color3 }}>
                    <TableCell sx={{ color: colors.color5, fontWeight: "bold" }}>
                      Date
                    </TableCell>
                    <TableCell align="right" sx={{ color: colors.color5, fontWeight: "bold" }}>
                      Price
                    </TableCell>
                    <TableCell align="right" sx={{ color: colors.color5, fontWeight: "bold" }}>
                      Multiplier
                    </TableCell>
                    <TableCell align="right" sx={{ color: colors.color5, fontWeight: "bold" }}>
                      Active Orders
                    </TableCell>
                    <TableCell sx={{ color: colors.color5, fontWeight: "bold" }}>
                      Reason
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {history.map((entry) => (
                    <TableRow
                      key={entry.history_id}
                      sx={{ "&:nth-of-type(odd)": { backgroundColor: colors.color5 } }}
                    >
                      <TableCell sx={{ color: colors.color1 }}>
                        {formatDate(entry.effective_from)}
                        {entry.effective_until && (
                          <>
                            <br />
                            <Typography variant="caption" sx={{ color: colors.color3 }}>
                              to {formatDate(entry.effective_until)}
                            </Typography>
                          </>
                        )}
                      </TableCell>
                      <TableCell align="right" sx={{ color: colors.color1, fontWeight: "bold" }}>
                        ${entry.price.toFixed(2)}
                      </TableCell>
                      <TableCell align="right" sx={{ color: colors.color1 }}>
                        {entry.demand_multiplier}x
                      </TableCell>
                      <TableCell align="right" sx={{ color: colors.color1 }}>
                        {entry.active_orders_count}
                      </TableCell>
                      <TableCell>
                        {entry.reason ? (
                          <Chip
                            label={entry.reason}
                            size="small"
                            sx={{
                              backgroundColor: getReasonColor(entry.reason),
                              color: colors.color5,
                              fontWeight: "bold",
                            }}
                          />
                        ) : (
                          <Typography variant="caption" sx={{ color: colors.color3 }}>
                            Manual adjustment
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
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
