import React, { useEffect, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Grid,
  TextField,
  Typography,
  Fade,
  Stack,
  Container,
  Chip,
  Alert,
  Divider,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from "@mui/material";
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  PersonAdd as PersonAddIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";
import { useAuth, axiosInstance } from "../context/Authcontext.jsx";

export default function Profile() {
  const { user, setUser } = useAuth();
  const theme = useTheme();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [profile, setProfile] = useState({
    name: user?.username || "",
    email: user?.email || "",
    role: user?.role || "",
    organization: "",
  });

  useEffect(() => {
    if (!user?.id) return;

    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.get(`/api/users/${user.id}`);
        const data = res.data;
        setProfile({
          name: data.name || user.username || "",
          email: data.email,
          role: data.role,
          organization: data.address || "",
        });
      } catch (err) {
        console.error("Failed to load profile", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    try {
      if (!user?.id) return;
      const payload = {
        name: profile.name,
        email: profile.email,
        address: profile.organization,
      };

      const res = await axiosInstance.put(`/api/users/${user.id}`, payload);
      const data = res.data;
      setProfile({
        name: data.name || "",
        email: data.email,
        role: data.role,
        organization: data.address || "",
      });
      setEditing(false);
    } catch (err) {
      console.error("Error updating profile:", err);
    }
  };

  const handleDevRole = async (role) => {
    if (!user?.id) return;
    try {
      const roleRes = await axiosInstance.post("/api/auth/dev/set-role", { user_id: user.id, role });
      const updatedUser = { ...user, role: roleRes.data.role, username: roleRes.data.username };
      setUser(updatedUser);
      localStorage.setItem('hirely_user', JSON.stringify(updatedUser));

      const res = await axiosInstance.get(`/api/users/${user.id}`);
      const data = res.data;
      setProfile({
        name: data.name || "",
        email: data.email,
        role: data.role,
        organization: data.address || "",
      });
      alert(`Role changed to ${role}. Access updated immediately.`);
    } catch (err) {
      console.error("Failed to set role", err);
      alert(err.response?.data?.detail || "Failed to set role");
    }
  };

  const handleDelete = async () => {
    try {
      alert('Delete functionality not yet implemented');
    } catch (err) {
      console.error("Error deleting account:", err);
    }
    setDeleteDialogOpen(false);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: `linear-gradient(135deg, ${theme.palette.background.default} 0%, ${theme.palette.mode === 'dark' ? '#1a1a2e' : '#f5f5f5'} 100%)`,
        py: 4,
      }}
    >
      <Container maxWidth="md">
        <Fade in timeout={600}>
          <Stack spacing={3}>
            {/* Profile Header */}
            <Card
              sx={{
                borderRadius: 3,
                boxShadow: theme.shadows[8],
                transition: 'all 0.3s ease',
                '&:hover': {
                  boxShadow: theme.shadows[12],
                },
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ alignItems: 'center' }}>
                  <Avatar
                    sx={{
                      width: 100,
                      height: 100,
                      bgcolor: theme.palette.primary.main,
                      fontSize: '2.5rem',
                      fontWeight: 700,
                    }}
                  >
                    {profile.name?.[0]?.toUpperCase() || '?'}
                  </Avatar>

                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                      {profile.name || 'User'}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', mb: 1 }}>
                      <Chip
                        label={profile.role?.toUpperCase() || 'USER'}
                        color="primary"
                        variant="outlined"
                        sx={{ fontWeight: 600 }}
                      />
                      <Chip
                        label="Member"
                        variant="outlined"
                      />
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {profile.email}
                    </Typography>
                  </Box>

                  {!editing && (
                    <Button
                      variant="contained"
                      startIcon={<EditIcon />}
                      onClick={() => setEditing(true)}
                      sx={{ textTransform: 'none' }}
                    >
                      Edit Profile
                    </Button>
                  )}
                </Stack>
              </CardContent>
            </Card>

            {/* Profile Details */}
            <Card sx={{ borderRadius: 3, boxShadow: theme.shadows[8] }}>
              <CardHeader
                title="Profile Information"
                titleTypographyProps={{ variant: 'h6', fontWeight: 700 }}
                sx={{ pb: 1 }}
              />
              <Divider />
              <CardContent sx={{ p: 4 }}>
                <Stack spacing={3}>
                  <TextField
                    label="Full Name"
                    name="name"
                    fullWidth
                    value={profile.name}
                    onChange={handleChange}
                    disabled={!editing}
                    variant={editing ? "outlined" : "standard"}
                  />
                  <TextField
                    label="Email"
                    name="email"
                    fullWidth
                    value={profile.email}
                    onChange={handleChange}
                    disabled={!editing}
                    variant={editing ? "outlined" : "standard"}
                  />
                  <TextField
                    label="Location / Organization"
                    name="organization"
                    fullWidth
                    value={profile.organization}
                    onChange={handleChange}
                    disabled={!editing}
                    variant={editing ? "outlined" : "standard"}
                  />

                  {editing && (
                    <Stack direction="row" spacing={2}>
                      <Button
                        variant="contained"
                        startIcon={<SaveIcon />}
                        onClick={handleSave}
                        sx={{ textTransform: 'none' }}
                      >
                        Save Changes
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<CancelIcon />}
                        onClick={() => setEditing(false)}
                        sx={{ textTransform: 'none' }}
                      >
                        Cancel
                      </Button>
                    </Stack>
                  )}
                </Stack>
              </CardContent>
            </Card>

            {/* Role Management */}
            <Card sx={{ borderRadius: 3, boxShadow: theme.shadows[8] }}>
              <CardHeader
                title="Account Type"
                titleTypographyProps={{ variant: 'h6', fontWeight: 700 }}
                sx={{ pb: 1 }}
              />
              <Divider />
              <CardContent sx={{ p: 4 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Switch between Freelancer and Client roles. You can also work as both!
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <Button
                    variant={profile.role === 'freelancer' ? 'contained' : 'outlined'}
                    startIcon={<PersonAddIcon />}
                    onClick={() => handleDevRole('freelancer')}
                    sx={{ textTransform: 'none' }}
                  >
                    Be a Freelancer
                  </Button>
                  <Button
                    variant={profile.role === 'client' ? 'contained' : 'outlined'}
                    startIcon={<PersonAddIcon />}
                    onClick={() => handleDevRole('client')}
                    sx={{ textTransform: 'none' }}
                  >
                    Be a Client
                  </Button>
                </Stack>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card
              sx={{
                borderRadius: 3,
                boxShadow: theme.shadows[8],
                border: `1px solid ${theme.palette.error.main}`,
              }}
            >
              <CardHeader
                title="Danger Zone"
                titleTypographyProps={{ variant: 'h6', fontWeight: 700, color: 'error' }}
                sx={{ pb: 1 }}
              />
              <Divider />
              <CardContent sx={{ p: 4 }}>
                <Alert severity="warning" sx={{ mb: 2 }} icon={<WarningIcon />}>
                  Deleting your account is permanent and cannot be undone.
                </Alert>
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => setDeleteDialogOpen(true)}
                  sx={{ textTransform: 'none' }}
                >
                  Delete Account
                </Button>
              </CardContent>
            </Card>
          </Stack>
        </Fade>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ fontWeight: 700, color: 'error.main' }}>
            Delete Account?
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 2 }}>
              <Typography>
                Are you sure you want to permanently delete your account? This action cannot be undone.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                All your data, including messages, orders, and services, will be deleted.
              </Typography>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button
              color="error"
              variant="contained"
              onClick={handleDelete}
            >
              Delete Permanently
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
}
