import { useState, useMemo, createContext } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import './index.css';
import App from './App.jsx';
import { AuthProvider } from '../context/Authcontext';
import { createAppTheme } from './theme';

export const ThemeModeContext = createContext({ mode: 'light', toggleMode: () => {} });

export default function Root() {
  const [mode, setMode] = useState(() => localStorage.getItem('themeMode') || 'light');
  const toggleMode = () => {
    setMode((m) => {
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
