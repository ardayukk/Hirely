import { createTheme } from '@mui/material/styles';

export const getDesignTokens = (mode) => ({
  palette: {
    mode,
    ...(mode === 'light'
      ? {
          // palette values for light mode
          primary: { main: '#549783' },
          background: { default: '#e1faf9', paper: '#ffffff' },
        }
      : {
          // palette values for dark mode
          primary: { main: '#78ffd6' },
          background: { default: '#121212', paper: '#1e1e1e' },
        }),
  },
});

export function createAppTheme(mode = 'light') {
  return createTheme(getDesignTokens(mode));
}
