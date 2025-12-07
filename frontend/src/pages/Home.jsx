import { Box, Button, Container, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";

export default function Home() {
    const navigate = useNavigate();

    const ActionGroup = ({ title, id, actions }) => (
        <Stack id={id} spacing={1.5} sx={{ border: "1px solid #e5e7eb", borderRadius: 2, p: 2 }}>
            <Typography variant="h6" fontWeight={700}>{title}</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
                {actions.map(({ label, to, variant }) => (
                    <Button key={label} variant={variant || "outlined"} onClick={() => navigate(to)} sx={{ textTransform: "none" }}>
                        {label}
                    </Button>
                ))}
            </Stack>
        </Stack>
    );

    return (
        <Box sx={{ minHeight: "100vh", background: "#f9fafb", py: 6 }}>
            <Container maxWidth="md">
                <Stack spacing={4}>
                    <Typography variant="h4" fontWeight={800}>cs353 db project home :D</Typography>

                    <ActionGroup
                        id="freelancer"
                        title="Freelancer"
                        actions={[
                            { label: "Create service", to: "/create-service", variant: "contained" },
                            { label: "My services", to: "/myServices" },
                            { label: "Orders", to: "/orders" },
                            { label: "Inbox", to: "/inbox" },
                        ]}
                    />

                    <ActionGroup
                        id="user"
                        title="User"
                        actions={[
                            { label: "Browse services", to: "/services", variant: "contained" },
                            { label: "My orders", to: "/orders" },
                            { label: "Messages", to: "/inbox" },
                        ]}
                    />

                    <ActionGroup
                        id="admin"
                        title="Admin"
                        actions={[
                            { label: "Admin panel", to: "/admin", variant: "contained" },
                            { label: "Manage users", to: "/admin" },
                        ]}
                    />

                    <ActionGroup
                        id="services"
                        title="Services"
                        actions={[
                            { label: "Service catalog", to: "/services", variant: "contained" },
                        ]}
                    />
                </Stack>
            </Container>
        </Box>
    );
}