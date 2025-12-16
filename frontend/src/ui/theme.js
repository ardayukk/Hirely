import { createTheme } from '@mui/material/styles';
import palette from '../helper/colors';

export const getDesignTokens = (mode) => {
  const isLight = mode === 'light';
  return {
    palette: {
      mode,
      primary: { main: palette.primary },
      secondary: { main: palette.accent },
      success: { main: palette.success },
      warning: { main: palette.warning },
      error: { main: palette.error },
      info: { main: palette.info },
      background: isLight
        ? { default: palette.bg, paper: palette.surface }
        : { default: '#141716', paper: '#1E211F' },
      text: isLight
        ? { primary: palette.text, secondary: palette.textMuted }
        : { primary: '#F0F4F3', secondary: '#A2B3AF' },
      divider: palette.border,
    },
    shape: { borderRadius: 10 },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 500,
            borderRadius: 8,
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backdropFilter: 'blur(12px)',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
    },
    typography: {
      fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
      h1: { fontSize: '2.2rem', fontWeight: 600 },
      h2: { fontSize: '1.8rem', fontWeight: 600 },
      h3: { fontSize: '1.4rem', fontWeight: 600 },
      body1: { fontSize: '1rem', lineHeight: 1.5 },
      body2: { fontSize: '0.875rem', lineHeight: 1.5 },
    },
  };
};

export function createAppTheme(mode = 'light') {
  return createTheme(getDesignTokens(mode));
}
