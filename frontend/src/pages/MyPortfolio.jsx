import { useState, useEffect } from 'react';
import { useAuth } from '../context/Authcontext';
import axiosInstance from '../utils/api';
import {
  Container,
  Card,
  CardContent,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Chip,
  Grid,
  Typography,
  Alert,
  IconButton,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

export default function MyPortfolio() {
  const { user } = useAuth();
  const [portfolio, setPortfolio] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image_url: '',
    project_url: '',
    tags: [],
  });
  const [tagInput, setTagInput] = useState('');

  const isFreelancer = user?.role === 'freelancer';

  useEffect(() => {
    if (!isFreelancer || !user?.id) {
      setError('Only freelancers can manage portfolio');
      setLoading(false);
      return;
    }
    loadPortfolio();
  }, [user]);

  const loadPortfolio = async () => {
    try {
      const res = await axiosInstance.get(`/api/my-portfolio?freelancer_id=${user.id}`);
      setPortfolio(res.data);
      setError('');
    } catch (err) {
      setError('Failed to load portfolio');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (item = null) => {
    if (item) {
      setEditingId(item.portfolio_id);
      setFormData({
        title: item.title,
        description: item.description,
        image_url: item.image_url,
        project_url: item.project_url,
        tags: item.tags || [],
      });
    } else {
      setEditingId(null);
      setFormData({
        title: '',
        description: '',
        image_url: '',
        project_url: '',
        tags: [],
      });
    }
    setTagInput('');
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingId(null);
    setFormData({
      title: '',
      description: '',
      image_url: '',
      project_url: '',
      tags: [],
    });
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((t) => t !== tag),
    });
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    try {
      if (editingId) {
        await axiosInstance.put(
          `/api/my-portfolio/${editingId}?freelancer_id=${user.id}`,
          formData
        );
      } else {
        await axiosInstance.post(
          `/api/my-portfolio?freelancer_id=${user.id}`,
          formData
        );
      }
      handleCloseDialog();
      loadPortfolio();
    } catch (err) {
      setError('Failed to save portfolio item');
      console.error(err);
    }
  };

  const handleDelete = async (portfolioId) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;

    try {
      await axiosInstance.delete(
        `/api/my-portfolio/${portfolioId}?freelancer_id=${user.id}`
      );
      loadPortfolio();
    } catch (err) {
      setError('Failed to delete portfolio item');
      console.error(err);
    }
  };

  if (!isFreelancer) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="warning">Only freelancers can manage portfolio</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">My Portfolio</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Item
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Typography>Loading...</Typography>
      ) : portfolio.length === 0 ? (
        <Card>
          <CardContent>
            <Typography color="textSecondary">
              No portfolio items yet. Click "Add Item" to get started!
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {portfolio.map((item) => (
            <Grid item xs={12} sm={6} md={4} key={item.portfolio_id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                {item.image_url && (
                  <Box
                    sx={{
                      width: '100%',
                      height: 200,
                      backgroundImage: `url(${item.image_url})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />
                )}
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" gutterBottom>
                    {item.title}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                    {item.description}
                  </Typography>
                  {item.project_url && (
                    <Typography variant="caption">
                      <a href={item.project_url} target="_blank" rel="noopener noreferrer">
                        View Project →
                      </a>
                    </Typography>
                  )}
                  <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {item.tags.map((tag) => (
                      <Chip key={tag} label={tag} size="small" variant="outlined" />
                    ))}
                  </Box>
                </CardContent>
                <Box sx={{ p: 1, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(item)}
                    title="Edit"
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDelete(item.portfolio_id)}
                    title="Delete"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Edit Portfolio Item' : 'Add Portfolio Item'}</DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Title *"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            fullWidth
            required
          />
          <TextField
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            fullWidth
            multiline
            rows={3}
          />
          <TextField
            label="Image URL"
            value={formData.image_url}
            onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
            fullWidth
            type="url"
            placeholder="https://example.com/image.jpg"
          />
          <TextField
            label="Project URL"
            value={formData.project_url}
            onChange={(e) => setFormData({ ...formData, project_url: e.target.value })}
            fullWidth
            type="url"
            placeholder="https://example.com"
          />
          
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Tags</Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField
                label="Add tag"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddTag();
                  }
                }}
                size="small"
                fullWidth
              />
              <Button onClick={handleAddTag} variant="outlined">Add</Button>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {formData.tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  onDelete={() => handleRemoveTag(tag)}
                />
              ))}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            {editingId ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
