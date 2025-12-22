import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Box, TextField, Select, MenuItem, Button, Typography, Alert } from '@mui/material';
import { useAuth, axiosInstance } from '../context/Authcontext';

export default function EditService() {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [service, setService] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    title: '',
    category: '',
    description: '',
    delivery_time: '',
    hourly_price: '',
    package_tier: '',
    sample_work: '',
  });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axiosInstance.get(`/api/services/${serviceId}`);
        setService(res.data);
        setForm({
          title: res.data.title || '',
          category: res.data.category || '',
          description: res.data.description || '',
          delivery_time: res.data.delivery_time ?? '',
          hourly_price: res.data.hourly_price ?? '',
          package_tier: res.data.package_tier || '',
          sample_work: res.data.sample_work || '',
        });
      } catch (err) {
        setError('Failed to load service');
      }
    };
    load();
  }, [serviceId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSave = async () => {
    if (!user || user.role !== 'freelancer') {
      alert('Only freelancers can edit their services');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const payload = {
        title: form.title || null,
        category: form.category || null,
        description: form.description || null,
        delivery_time: form.delivery_time ? parseInt(form.delivery_time) : null,
        hourly_price: form.hourly_price ? parseFloat(form.hourly_price) : null,
        package_tier: form.package_tier || null,
        sample_work: form.sample_work || null,
      };
      await axiosInstance.patch(`/api/services/${serviceId}?freelancer_id=${user.id}`, payload);
      alert('Service updated');
      navigate(`/services/${serviceId}`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update service');
    } finally {
      setLoading(false);
    }
  };

  if (!service) {
    return (
      <Container sx={{ mt: 4 }}>
        <Typography>Loading service...</Typography>
      </Container>
    );
  }

  if (service.freelancer?.user_id !== user?.id) {
    return (
      <Container sx={{ mt: 4 }}>
        <Alert severity="warning">You do not own this service.</Alert>
      </Container>
    );
  }

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>Edit Service</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Box sx={{ display: 'grid', gap: 2, maxWidth: 600 }}>
        <TextField label="Title" name="title" value={form.title} onChange={handleChange} />
        <TextField label="Category" name="category" value={form.category} onChange={handleChange} />
        <TextField label="Description" name="description" value={form.description} onChange={handleChange} multiline rows={3} />
        <TextField label="Delivery (days)" name="delivery_time" value={form.delivery_time} onChange={handleChange} type="number" />
        <TextField label="Hourly Price" name="hourly_price" value={form.hourly_price} onChange={handleChange} type="number" />
        <Select value={form.package_tier} onChange={(e) => setForm((f) => ({ ...f, package_tier: e.target.value }))} displayEmpty>
          <MenuItem value="">No tier</MenuItem>
          <MenuItem value="basic">Basic</MenuItem>
          <MenuItem value="standard">Standard</MenuItem>
          <MenuItem value="premium">Premium</MenuItem>
        </Select>
        <TextField label="Sample Work" name="sample_work" value={form.sample_work} onChange={handleChange} multiline rows={2} />
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="contained" onClick={handleSave} disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</Button>
          <Button variant="outlined" onClick={() => navigate('/myServices')}>Cancel</Button>
        </Box>
      </Box>
    </Container>
  );
}
