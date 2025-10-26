import '@mantine/core/styles.css';

import { MantineProvider } from '@mantine/core';
import { AuthProvider } from './contexts/AuthContext';
import { Router } from './Router';
import { theme } from './theme';

export default function App() {
  return (
    <MantineProvider theme={theme}>
      <AuthProvider>
        <Router />
      </AuthProvider>
    </MantineProvider>
  );
}
