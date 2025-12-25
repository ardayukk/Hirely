import React, { useEffect, useState } from 'react';
import { Container, Typography, Box, Grid, Card, CardContent, CardActions, Button, Chip, Alert, CircularProgress, IconButton } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { axiosInstance, useAuth } from '../context/Authcontext';
import DeleteIcon from '@mui/icons-material/Delete';
import FavoriteIcon from '@mui/icons-material/Favorite';

export default function Favorites() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.role !== 'client') {
      navigate('/');
      return;
    }
    loadFavorites();
  }, [user]);

  const loadFavorites = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await axiosInstance.get(`/api/favorites?client_id=${user.id}`);
      // Enrich with service/freelancer details
      const enriched = await Promise.all(
        res.data.map(async (fav) => {
          try {
            if (fav.service_id) {
              const svcRes = await axiosInstance.get(`/api/services/${fav.service_id}`);
              return { ...fav, service: svcRes.data };
            } else if (fav.freelancer_id) {
              const flRes = await axiosInstance.get(`/api/users/${fav.freelancer_id}`);
              return { ...fav, freelancer: flRes.data };
            }
          } catch (err) {
            console.error('Failed to fetch favorite detail', err);
          }
          return fav;
        })
      );
      setFavorites(enriched);
    } catch (err) {
      console.error('Failed to load favorites', err);
      setError(err.response?.data?.detail || 'Failed to load favorites');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (fav) => {
    try {
      const params = new URLSearchParams({ client_id: user.id });
      if (fav.service_id) params.append('service_id', fav.service_id);
      if (fav.freelancer_id) params.append('freelancer_id', fav.freelancer_id);
      await axiosInstance.delete(`/api/favorites?${params.toString()}`);
      await loadFavorites();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to remove favorite');
    }
  };

  if (loading) {
    return (
      <Container sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <FavoriteIcon sx={{ mr: 1, color: 'error.main' }} />
        <Typography variant="h4">My Favorites</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {favorites.length === 0 ? (
        <Alert severity="info">
          You haven't saved any favorites yet. Browse services and freelancers to add them!
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {favorites.map((fav) => (
            <Grid item xs={12} md={6} key={fav.favorite_id}>
              <Card>
                <CardContent>
                  {fav.service && (
                    <>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                        <Typography variant="h6">{fav.service.title}</Typography>
                        <Chip label="Service" color="primary" size="small" />
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {fav.service.description || 'No description'}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Category:</strong> {fav.service.category}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Price:</strong> ${fav.service.hourly_price?.toFixed(2) || '0.00'}/hr
                      </Typography>
                      <Typography variant="body2">
                        <strong>Rating:</strong> ★ {fav.service.average_rating?.toFixed(1) || '0.0'}
                      </Typography>
                    </>
                  )}
                  {fav.freelancer && (
                    <>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                        <Typography variant="h6">{fav.freelancer.name || `Freelancer #${fav.freelancer_id}`}</Typography>
                        <Chip label="Freelancer" color="secondary" size="small" />
                      </Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {fav.freelancer.tagline || 'No tagline'}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Rating:</strong> ★ {fav.freelancer.avg_rating?.toFixed(1) || '0.0'}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Orders:</strong> {fav.freelancer.total_orders || 0}
                      </Typography>
                    </>
                  )}
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    Saved on {new Date(fav.created_at).toLocaleDateString()}
                  </Typography>
                </CardContent>
                <CardActions>
                  {fav.service && (
                    <Button size="small" onClick={() => navigate(`/services/${fav.service_id}`)}>
                      View Service
                    </Button>
                  )}
                  {fav.freelancer && (
                    <Button size="small" onClick={() => navigate(`/profile/${fav.freelancer_id}`)}>
                      View Profile
                    </Button>
                  )}
                  <IconButton size="small" color="error" onClick={() => handleRemove(fav)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
}
