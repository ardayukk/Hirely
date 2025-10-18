import { useState, useEffect, useRef } from 'react';
import { Box, TextField, Button, Typography, Alert, Paper } from '@mui/material';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/Authcontext.jsx';
import colors from '../helper/colors';

export default function Register() {
  const nav = useNavigate();
  const { register } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [bubbles, setBubbles] = useState([]);
  const bubbleRefs = useRef([]);

  // Initialize random bubbles with varied sizes and full-screen dispersion
  useEffect(() => {
    const temp = Array.from({ length: 20 }).map(() => {
      const size = Math.random() * 120 + 40; // 40-160px
      return {
        size,
        x: Math.random() * (window.innerWidth - size),
        y: Math.random() * (window.innerHeight - size),
        dx: (Math.random() - 0.5) * (0.3 + Math.random() * 0.5),
        dy: (Math.random() - 0.5) * (0.3 + Math.random() * 0.5),
        color: `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(
          Math.random() * 255
        )}, ${Math.floor(Math.random() * 255)}, 0.15)`,
        popped: false,
        scale: 1,
        remove: false,
      };
    });
    setBubbles(temp);
    bubbleRefs.current = temp;
  }, []);

  // Animate bubbles smoothly
  useEffect(() => {
    let animationFrame;
    const animate = () => {
      bubbleRefs.current = bubbleRefs.current.map(b => {
        if (b.popped) return b;

        let newX = b.x + b.dx;
        let newY = b.y + b.dy;

        if (newX < -b.size) newX = window.innerWidth;
        if (newX > window.innerWidth) newX = -b.size;
        if (newY < -b.size) newY = window.innerHeight;
        if (newY > window.innerHeight) newY = -b.size;

        return { ...b, x: newX, y: newY };
      });

      setBubbles([...bubbleRefs.current]);
      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  // Pop a bubble
  const popBubble = index => {
    bubbleRefs.current[index].popped = true;
    bubbleRefs.current[index].scale = 1.4;
    setBubbles([...bubbleRefs.current]);

    setTimeout(() => {
      bubbleRefs.current[index].scale = 0;
      bubbleRefs.current[index].remove = true;
      setBubbles([...bubbleRefs.current]);
    }, 100);

    setTimeout(() => {
      bubbleRefs.current.splice(index, 1);
      setBubbles([...bubbleRefs.current]);
    }, 400);
  };

  const submit = async e => {
    e.preventDefault();
    setErr('');
    try {
      await register({ username, email, password });
      nav('/login');
    } catch (e) {
      setErr(e.message || 'Registration failed');
    }
  };

  return (
    <Box
      sx={{
        width: '100vw',
        height: '100vh',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `radial-gradient(circle at 50% 50%, ${colors.color2} 0%, ${colors.color1} 100%)`,
      }}
    >
      {/* Bubble Layer */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          overflow: 'hidden',
          zIndex: 0,
        }}
      >
        {bubbles.map((b, i) => (
          <Box
            key={i}
            onClick={() => popBubble(i)}
            sx={{
              position: 'absolute',
              width: b.size,
              height: b.size,
              borderRadius: '50%',
              backgroundColor: b.color,
              transform: `translate3d(${b.x}px, ${b.y}px, 0) scale(${b.scale})`,
              opacity: b.remove ? 0 : 1,
              pointerEvents: 'auto',
              cursor: 'pointer',
              transition: b.popped
                ? 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease'
                : 'none',
            }}
          />
        ))}
      </Box>

      {/* Centered Paper */}
      <Paper
        elevation={16}
        sx={{
          p: { xs: 4, sm: 6 },
          borderRadius: 5,
          width: '90%',
          maxWidth: 450,
          backgroundColor: colors.color5,
          color: colors.color1,
          boxShadow: `0 16px 48px rgba(0,0,0,0.35)`,
          position: 'relative',
          zIndex: 10,
          transition: 'transform 0.5s ease, box-shadow 0.5s ease',
          '&:hover': {
            transform: 'scale(1.02)',
            boxShadow: `0 24px 64px rgba(0,0,0,0.45)`,
          },
        }}
      >
        <Typography
          variant="h3"
          fontWeight="700"
          gutterBottom
          textAlign="center"
          sx={{ color: colors.color2, letterSpacing: 1 }}
        >
          Create Account
        </Typography>

        <Typography
          variant="body1"
          textAlign="center"
          mb={4}
          sx={{ color: colors.color3, fontWeight: 500 }}
        >
          Sign up to compare artifacts and manage evaluations.
        </Typography>

        {err && <Alert severity="error" sx={{ mb: 3 }}>{err}</Alert>}

        <Box component="form" onSubmit={submit} sx={{ display: 'grid', gap: 3 }}>
          <TextField
            label="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            fullWidth
            InputLabelProps={{ style: { color: colors.color3, fontWeight: 500 } }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 3,
                transition: 'all 0.3s ease',
                '&:hover fieldset': { borderColor: colors.color2 },
                '&.Mui-focused fieldset': { borderColor: colors.color2 },
              },
            }}
          />
          <TextField
            label="Email Address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            type="email"
            required
            fullWidth
            InputLabelProps={{ style: { color: colors.color3, fontWeight: 500 } }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 3,
                transition: 'all 0.3s ease',
                '&:hover fieldset': { borderColor: colors.color2 },
                '&.Mui-focused fieldset': { borderColor: colors.color2 },
              },
            }}
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            fullWidth
            InputLabelProps={{ style: { color: colors.color3, fontWeight: 500 } }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 3,
                transition: 'all 0.3s ease',
                '&:hover fieldset': { borderColor: colors.color2 },
                '&.Mui-focused fieldset': { borderColor: colors.color2 },
              },
            }}
          />

          <Button
            variant="contained"
            type="submit"
            size="large"
            sx={{
              py: 1.5,
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: 3,
              background: `linear-gradient(90deg, ${colors.color2}, #6b47d6)`,
              color: colors.color5,
              boxShadow: `0 8px 30px rgba(0,0,0,0.3)`,
              transition: 'all 0.3s ease',
              '&:hover': {
                background: `linear-gradient(90deg, #472b8d, ${colors.color2})`,
                transform: 'translateY(-2px)',
                boxShadow: `0 12px 40px rgba(0,0,0,0.35)`,
              },
            }}
          >
            Create Account
          </Button>

          <Typography color="text.secondary" textAlign="center" mt={1}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: colors.color2, textDecoration: 'none', fontWeight: 600 }}>
              Sign in
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}