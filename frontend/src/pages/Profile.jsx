import React, { useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  Typography,
  Fade,
} from "@mui/material";
import colors from "../../helper/colors";
import { axiosInstance } from "../context/AuthContext";
import { getCookie } from "../context/_helpers";

export default function Profile() {
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState({
    name: "Arda Yüksel",
    email: "arda.yuksel@bilkent.edu.tr",
    role: "Researcher",
    organization: "Bilkent University",
  });

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    try {
      // TODO: integrate backend update endpoint (e.g. PUT /api/user/update)
      // await axios.put("http://localhost:8000/api/user/update/", profile);
      console.log("Profile saved:", profile);
      setEditing(false);
    } catch (err) {
      console.error("Error updating profile:", err);
    }
  };

  const handleDisable = async () => {
    if (!window.confirm("Are you sure you want to disable your account?")) return;
    try {
      // ensure CSRF cookie present and send POST to disable endpoint
      await axiosInstance.get('/auth/csrf/');
      const csrftoken = getCookie('csrftoken');
      const res = await axiosInstance.post('/auth/api/disable/', {}, { headers: { 'X-CSRFToken': csrftoken } });
      if (res.data?.success) {
        alert('Your account has been disabled. You will be logged out.');
        // redirect to login or home
        window.location.href = '/login';
      } else {
        alert(res.data?.error || 'Disable failed');
      }
    } catch (err) {
      console.error("Error disabling account:", err);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("This will permanently delete your account. Continue?")) return;
    try {
      await axiosInstance.get('/auth/csrf/');
      const csrftoken = getCookie('csrftoken');
      const res = await axiosInstance.post('/auth/api/delete/', {}, { headers: { 'X-CSRFToken': csrftoken } });
      if (res.data?.success) {
        alert('Your account has been deleted. Redirecting to goodbye page.');
        window.location.href = '/';
      } else {
        alert(res.data?.error || 'Delete failed');
      }
    } catch (err) {
      console.error("Error deleting account:", err);
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
            width: 460,
            borderRadius: 5,
            backgroundColor: colors.color5,
            boxShadow: `0 8px 30px ${colors.color3}`,
            transition: "all 0.3s ease-in-out",
            "&:hover": {
              transform: "translateY(-4px)",
              boxShadow: `0 12px 40px ${colors.color3}`,
            },
          }}
        >
          <CardContent sx={{ p: 5 }}>
            <Box textAlign="center" mb={4}>
              <Avatar
                sx={{
                  bgcolor: colors.color2,
                  width: 90,
                  height: 90,
                  mx: "auto",
                  fontSize: 38,
                  fontWeight: 600,
                  border: `3px solid ${colors.color3}`,
                }}
              >
                {profile.name.charAt(0)}
              </Avatar>

              <Typography
                variant="h5"
                sx={{
                  mt: 2,
                  fontWeight: "bold",
                  letterSpacing: "0.5px",
                  color: colors.color1,
                }}
              >
                {profile.name}
              </Typography>

              <Typography
                variant="subtitle1"
                sx={{ color: colors.color3, opacity: 0.9 }}
              >
                {profile.role}
              </Typography>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="Full Name"
                  name="name"
                  fullWidth
                  value={profile.name}
                  onChange={handleChange}
                  disabled={!editing}
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
                  label="Email"
                  name="email"
                  fullWidth
                  value={profile.email}
                  onChange={handleChange}
                  disabled={!editing}
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
                  label="Organization"
                  name="organization"
                  fullWidth
                  value={profile.organization}
                  onChange={handleChange}
                  disabled={!editing}
                  InputProps={{
                    style: {
                      backgroundColor: colors.color5,
                      borderRadius: 6,
                      color: colors.color1,
                    },
                  }}
                />
              </Grid>
            </Grid>

            {/* ✅ Edit / Save button */}
            <Box textAlign="center" mt={4}>
              {editing ? (
                <Button
                  variant="contained"
                  sx={{
                    px: 4,
                    py: 1.2,
                    background: `linear-gradient(90deg, ${colors.color2}, ${colors.color1})`,
                    fontWeight: "bold",
                    borderRadius: "2rem",
                    textTransform: "none",
                    color: colors.color5,
                    "&:hover": {
                      background: `linear-gradient(90deg, ${colors.color1}, ${colors.color2})`,
                      transform: "scale(1.05)",
                    },
                  }}
                  onClick={handleSave}
                >
                  Save Changes
                </Button>
              ) : (
                <Button
                  variant="outlined"
                  sx={{
                    px: 4,
                    py: 1.2,
                    color: colors.color1,
                    borderColor: colors.color1,
                    borderRadius: "2rem",
                    textTransform: "none",
                    fontWeight: "bold",
                    backgroundColor: colors.color5,
                    "&:hover": {
                      backgroundColor: colors.color4,
                      transform: "scale(1.05)",
                    },
                  }}
                  onClick={() => setEditing(true)}
                >
                  Edit Profile
                </Button>
              )}
            </Box>

            {/* ✅ Disable / Delete buttons */}
            <Box textAlign="center" mt={3} display="flex" flexDirection="column" gap={1}>
              <Button
                variant="outlined"
                color="warning"
                sx={{
                  borderColor: "#e6b800",
                  color: "#e6b800",
                  borderRadius: "2rem",
                  textTransform: "none",
                  "&:hover": {
                    backgroundColor: "#fff3cd",
                  },
                }}
                onClick={handleDisable}
              >
                Disable Account
              </Button>

              <Button
                variant="outlined"
                color="success"
                sx={{
                  borderColor: "#198754",
                  color: "#198754",
                  borderRadius: "2rem",
                  textTransform: "none",
                  "&:hover": {
                    backgroundColor: "#e6f4ea",
                  },
                }}
                onClick={async () => {
                  try {
                    await axiosInstance.get('/auth/csrf/');
                    const csrftoken = getCookie('csrftoken');
                    const res = await axiosInstance.post('/auth/api/enable/', {}, { headers: { 'X-CSRFToken': csrftoken } });
                    if (res.data?.success) alert('Account enabled');
                    else alert(res.data?.error || 'Enable failed');
                  } catch (err) {
                    console.error('Error enabling account', err);
                  }
                }}
              >
                Re-enable Account
              </Button>

              <Button
                variant="outlined"
                color="error"
                sx={{
                  borderColor: "#d32f2f",
                  color: "#d32f2f",
                  borderRadius: "2rem",
                  textTransform: "none",
                  "&:hover": {
                    backgroundColor: "#fdecea",
                  },
                }}
                onClick={handleDelete}
              >
                Delete Account
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Fade>
    </Box>
  );
}
