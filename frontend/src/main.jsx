import React, { useState, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import App from './ui/App.jsx';
import './ui/index.css';
import { AuthProvider } from './context/Authcontext';
import { ThemeProvider } from '@mui/material/styles';
import { createAppTheme } from './ui/theme';
import { ThemeModeContext } from './ui/ThemeModeContext';

function Root() {
  const [mode, setMode] = useState(() => localStorage.getItem('themeMode') || 'light');
  const toggleMode = () => {
    setMode(m => {
      const next = m === 'light' ? 'dark' : 'light';
      localStorage.setItem('themeMode', next);
      return next;
    });
  };

  const theme = useMemo(() => createAppTheme(mode), [mode]);

  return (
    <ThemeModeContext.Provider value={{ mode, toggleMode }}>
      <ThemeProvider theme={theme}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
