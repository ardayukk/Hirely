import {
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    Checkbox,
    Chip,
    Divider,
    Fade,
    FormControlLabel,
    Grid,
    Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { axiosInstance, useAuth } from "../context/Authcontext";
import colors from "../helper/colors";

export default function ServiceDetail() {
    const { serviceId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [service, setService] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedAddons, setSelectedAddons] = useState([]);
    const [isFavorited, setIsFavorited] = useState(false);

    useEffect(() => {
        const fetchServiceDetail = async () => {
            try {
                setLoading(true);
                const res = await axiosInstance.get(`/api/services/${serviceId}`);
                setService(res.data);
                // Preselect none; preserve existing selection if IDs still present
                if (res.data?.addons?.length) {
                    setSelectedAddons((prev) => prev.filter((id) => res.data.addons.some((a) => a.addon_id === id)));
                } else {
                    setSelectedAddons([]);
                }

                // Check if service is favorited
                if (user?.id) {
                    try {
                        const favRes = await axiosInstance.get(`/api/favorites?client_id=${user.id}`);
                        const isFav = favRes.data.some((fav) => fav.service_id === parseInt(serviceId));
                        setIsFavorited(isFav);
                    } catch (err) {
                        console.error("Failed to check favorite status", err);
                    }
                }
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

    const toggleAddon = (id) => {
        setSelectedAddons((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

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
                                    F
                                </Avatar>
                                <Box>
                                    <Typography variant="body1" sx={{ fontWeight: "bold", color: colors.color1 }}>
                                        {service.freelancer.first_name} {service.freelancer.last_name}
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
                        {service.addons && service.addons.length > 0 && (
                            <>
                                <Divider sx={{ my: 3 }} />
                                <Box mb={3}>
                                    <Typography variant="h6" sx={{ fontWeight: "bold", color: colors.color1, mb: 2 }}>
                                        Add-ons ({service.addons.length})
                                    </Typography>
                                    <Grid container spacing={2}>
                                        {service.addons.map((addon) => (
                                            <Grid item xs={12} sm={6} key={addon.addon_id}>
                                                <Card
                                                    sx={{
                                                        p: 2,
                                                        backgroundColor: colors.color4,
                                                        borderRadius: 2,
                                                        display: "flex",
                                                        alignItems: "flex-start",
                                                        gap: 1,
                                                    }}
                                                >
                                                    <FormControlLabel
                                                        control={
                                                            <Checkbox
                                                                checked={selectedAddons.includes(addon.addon_id)}
                                                                onChange={() => toggleAddon(addon.addon_id)}
                                                                color="primary"
                                                            />
                                                        }
                                                        label={
                                                            <Box onClick={() => toggleAddon(addon.addon_id)} sx={{ cursor: "pointer" }}>
                                                                <Typography variant="body1" sx={{ fontWeight: "bold", color: colors.color1 }}>
                                                                    {addon.title}
                                                                </Typography>
                                                                <Typography variant="body2" sx={{ color: colors.color3, mb: 0.5 }}>
                                                                    {addon.description || "No description"}
                                                                </Typography>
                                                                <Typography variant="body2" sx={{ color: colors.color1, fontWeight: "bold" }}>
                                                                    +${addon.price ? addon.price.toFixed(2) : "0.00"}
                                                                    {addon.delivery_time_extension > 0 && ` | +${addon.delivery_time_extension} days`}
                                                                </Typography>
                                                            </Box>
                                                        }
                                                    />
                                                </Card>
                                            </Grid>
                                        ))}
                                    </Grid>
                                </Box>
                            </>
                        )}

                        {/* Action Buttons */}
                        <Box display="flex" gap={2} mt={4} flexWrap="wrap">
                            {service.freelancer?.user_id === undefined ? null : (
                                service.freelancer.user_id === (typeof window !== 'undefined' && window.localStorage.getItem('hirely_user') ? JSON.parse(window.localStorage.getItem('hirely_user')).id : null)
                                    ? (
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
                                            onClick={() => navigate(`/services/${service.service_id}/edit`)}
                                        >
                                            Edit Service
                                        </Button>
                                    ) : (
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
                                            onClick={() =>
                                                navigate(`/checkout/${service.service_id}`, {
                                                    state: { selectedAddons },
                                                })
                                            }
                                        >
                                            Order Now
                                        </Button>
                                    )
                            )}
                            {service.freelancer?.user_id !== user?.id && user?.role === 'client' && (
                                <Button
                                    variant="outlined"
                                    sx={{
                                        py: 1.5,
                                        px: 3,
                                        color: isFavorited ? colors.color2 : colors.color1,
                                        borderColor: isFavorited ? colors.color2 : colors.color1,
                                        backgroundColor: isFavorited ? `${colors.color2}15` : 'transparent',
                                        fontWeight: "bold",
                                        "&:hover": { backgroundColor: colors.color4 },
                                    }}
                                    onClick={async () => {
                                        try {
                                            if (isFavorited) {
                                                // Remove from favorites
                                                await axiosInstance.delete(`/api/favorites?client_id=${user.id}&service_id=${service.service_id}`);
                                                setIsFavorited(false);
                                                alert('Removed from favorites');
                                            } else {
                                                // Add to favorites
                                                await axiosInstance.post(`/api/favorites?client_id=${user.id}`, { service_id: service.service_id });
                                                setIsFavorited(true);
                                                alert('Added to favorites');
                                            }
                                        } catch (err) {
                                            alert(err.response?.data?.detail || 'Failed to update favorite');
                                        }
                                    }}
                                >
                                    {isFavorited ? 'Unfavorite' : 'Favorite'}
                                </Button>
                            )}
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
                                onClick={() => navigate(`/portfolio/${service.freelancer?.user_id}`)}
                            >
                                Portfolio
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
                                onClick={() => navigate(`/pricing-history/${service.service_id}`)}
                            >
                                Pricing History
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
                                onClick={() => navigate(`/service-versions/${service.service_id}`)}
                            >
                                Version History
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
                                onClick={() => {
                                    const isOwner = service.freelancer?.user_id === user?.id;
                                    navigate(isOwner ? "/myServices" : "/services");
                                }}
                            >
                                Back
                            </Button>
                        </Box>
                    </CardContent>
                </Card>
            </Fade>
        </Box>
    );
}
