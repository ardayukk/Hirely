import React, { useEffect, useState } from 'react';
import { Container, Typography, Box, Grid, Card, CardMedia, CardContent, Chip, Alert, CircularProgress } from '@mui/material';
import { useParams } from 'react-router-dom';
import { axiosInstance } from '../context/Authcontext';

export default function Portfolio() {
  const { freelancerId } = useParams();
  const [portfolio, setPortfolio] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [freelancer, setFreelancer] = useState(null);

  useEffect(() => {
    loadPortfolio();
  }, [freelancerId]);

  const loadPortfolio = async () => {
    try {
      setLoading(true);
      setError('');
      // Fetch freelancer info
      const userRes = await axiosInstance.get(`/api/users/${freelancerId}`);
      setFreelancer(userRes.data);
      
      // Fetch portfolio items
      const portfolioRes = await axiosInstance.get(`/api/portfolio/${freelancerId}`);
      setPortfolio(portfolioRes.data || []);
    } catch (err) {
      console.error('Failed to load portfolio', err);
      setError(err.response?.data?.detail || 'Failed to load portfolio');
    } finally {
      setLoading(false);
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
      <Typography variant="h4" gutterBottom>
        {freelancer?.name || 'Freelancer'}'s Portfolio
      </Typography>
      {freelancer?.tagline && (
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {freelancer.tagline}
        </Typography>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {portfolio.length === 0 ? (
        <Alert severity="info">This freelancer hasn't added any portfolio items yet.</Alert>
      ) : (
        <Grid container spacing={3}>
          {portfolio.map((item) => (
            <Grid item xs={12} md={6} lg={4} key={item.portfolio_id}>
              <Card>
                {item.image_url && (
                  <CardMedia
                    component="img"
                    height="200"
                    image={item.image_url}
                    alt={item.title}
                    sx={{ objectFit: 'cover' }}
                  />
                )}
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {item.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {item.description || 'No description'}
                  </Typography>
                  {item.tags && item.tags.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                      {item.tags.map((tag, idx) => (
                        <Chip key={idx} label={tag} size="small" />
                      ))}
                    </Box>
                  )}
                  {item.project_url && (
                    <Typography variant="body2">
                      <a href={item.project_url} target="_blank" rel="noopener noreferrer">
                        View Project →
                      </a>
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    Added {new Date(item.created_at).toLocaleDateString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
}
