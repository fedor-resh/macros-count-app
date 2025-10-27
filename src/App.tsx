import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';

import { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { MantineProvider } from '@mantine/core';
import { queryClient } from './lib/queryClient';
import { Router } from './Router';
import { useAuthStore } from './stores/authStore';
import { theme } from './theme';

export default function App() {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme} defaultColorScheme="dark">
        <Router />
      </MantineProvider>
    </QueryClientProvider>
  );
}
