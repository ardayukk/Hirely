import React, { useState, useEffect } from "react";
import { Box, Drawer, List, ListItemButton, ListItemText, Collapse, Table, TableBody, TableCell, TableRow, Typography, TextField, Button, Paper, Alert } from "@mui/material";
import { useAuth, axiosInstance } from '../context/AuthContext';
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";

export default function Home() {
  // state for sidebar collapses
  const [openTodos, setOpenTodos] = useState(false);
  const [openStudies, setOpenStudies] = useState(false);
  const [openEvaluations, setOpenEvaluations] = useState(false);

  const handleToggle = (section) => {
    switch (section) {
      case "todos": setOpenTodos(!openTodos); break;
      case "studies": setOpenStudies(!openStudies); break;
      case "evaluations": setOpenEvaluations(!openEvaluations); break;
      default: break;
    }
  };

  // dummy data
  const todos = [{ id: 1, title: "Finish survey" }, { id: 2, title: "Upload artifact" }];
  const evaluations = [{ id: 1, name: "Artifact 1" }, { id: 2, name: "Artifact 2" }];

  const { user } = useAuth();
  const [studies, setStudies] = useState([]);
  const [publicStudies, setPublicStudies] = useState([]);
  const [allStudies, setAllStudies] = useState([]);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [err, setErr] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchStudies();
  }, [user]);

  async function fetchStudies() {
    try {
      const res = await axiosInstance.get('/api/studies/');
      const data = res.data || [];
      setAllStudies(data);
      // For backward-compatibility with existing UI variable
      setPublicStudies(data.filter(s => s.is_public));
    } catch (e) {
      console.error('Failed to load studies', e);
    }
  }

  // Local helper to read cookie
  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  }

  // Ensure CSRF cookie is present (backend view sets cookie)
  async function ensureCsrf() {
    try {
      await axiosInstance.get('/auth/csrf/');
    } catch (err) {
      // ignore
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setErr('');
    setSuccess('');
    try {
      setCreating(true);
      await ensureCsrf();
      const csrftoken = getCookie('csrftoken');
      const res = await axiosInstance.post('/api/studies/', { title, description, is_public: false }, { headers: { 'X-CSRFToken': csrftoken, 'Content-Type': 'application/json' } });
      setTitle(''); setDescription('');
      // If backend returned created object, add it; otherwise refetch
      if (res?.data) {
        // prepend to list so user sees it immediately
        setAllStudies(prev => [res.data, ...prev]);
        setSuccess('Study created');
      } else {
        fetchStudies();
      }
    } catch (e) {
      // Normalize error into a string so React doesn't try to render an object
      const data = e.response?.data;
      let message = e.message || 'Create failed';
      if (data) {
        if (typeof data === 'string') message = data;
        else if (data.detail) message = data.detail;
        else message = JSON.stringify(data);
      }
      setErr(message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: 250,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: 250, boxSizing: "border-box", paddingTop: 2 },
        }}
      >
        <List>
          {/* To-Do's */}
          <ListItemButton onClick={() => handleToggle("todos")}>
            <ListItemText primary="To-Do's" />
            {openTodos ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
          <Collapse in={openTodos} timeout="auto" unmountOnExit>
            <Table size="small">
              <TableBody>
                {todos.map(todo => (
                  <TableRow key={todo.id}>
                    <TableCell>{todo.title}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Collapse>

          {/* Studies */}
          <ListItemButton onClick={() => handleToggle("studies")}>
            <ListItemText primary="Studies" />
            {openStudies ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
          <Collapse in={openStudies} timeout="auto" unmountOnExit>
            <Table size="small">
              <TableBody>
                {studies.map(study => (
                  <TableRow key={study.id}>
                    <TableCell>{study.title}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Collapse>

          {/* Evaluations */}
          <ListItemButton onClick={() => handleToggle("evaluations")}>
            <ListItemText primary="Evaluations" />
            {openEvaluations ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
          <Collapse in={openEvaluations} timeout="auto" unmountOnExit>
            <Table size="small">
              <TableBody>
                {evaluations.map(evalItem => (
                  <TableRow key={evalItem.id}>
                    <TableCell>{evalItem.name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Collapse>
        </List>
      </Drawer>

      {/* Main feed */}
      <Box sx={{ flexGrow: 1, padding: 3 }}>
        <Typography variant="h4" gutterBottom>Public Studies Feed</Typography>
        {err && <Alert severity="error">{err}</Alert>}

        {user && (
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Create new study</Typography>
            <Box component="form" onSubmit={handleCreate} sx={{ display: 'grid', gap: 2 }}>
              <TextField label="Title" value={title} onChange={e=>setTitle(e.target.value)} required />
              <TextField label="Description" value={description} onChange={e=>setDescription(e.target.value)} multiline rows={3} />
              <Button type="submit" variant="contained" disabled={creating}>Create</Button>
            </Box>
          </Paper>
        )}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        {user && (
          <>
            <Typography variant="h5" gutterBottom>My Studies</Typography>
            {allStudies.filter(s => user && s.owner === user.id).length === 0 && <Typography color="text.secondary">You have no studies yet.</Typography>}
            {allStudies.filter(s => user && s.owner === user.id).map(study => (
              <Box key={study.id} sx={{ marginBottom: 2, padding: 2, border: "1px solid #ddd", borderRadius: 1 }}>
                <Typography variant="h6">{study.title}</Typography>
                <Typography>{study.description}</Typography>
                <Typography variant="caption">Owner: {study.owner_username || 'me'}</Typography>
              </Box>
            ))}
          </>
        )}

        <Typography variant="h5" gutterBottom sx={{ mt: 2 }}>Public Studies</Typography>
        {publicStudies.length === 0 && <Typography color="text.secondary">No public studies found.</Typography>}
        {publicStudies.map(study => (
          <Box key={study.id} sx={{ marginBottom: 2, padding: 2, border: "1px solid #ddd", borderRadius: 1 }}>
            <Typography variant="h6">{study.title}</Typography>
            <Typography>{study.description}</Typography>
            <Typography variant="caption">Owner: {study.owner_username || '—'}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
