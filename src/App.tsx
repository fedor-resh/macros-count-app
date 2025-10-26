import '@mantine/core/styles.css';

import { Provider } from 'react-redux';
import { MantineProvider } from '@mantine/core';
import { AuthProvider } from './contexts/AuthContext';
import { Router } from './Router';
import { store } from './store/store';
import { theme } from './theme';

export default function App() {
  return (
    <Provider store={store}>
      <MantineProvider theme={theme} defaultColorScheme="dark">
        <AuthProvider>
          <Router />
        </AuthProvider>
      </MantineProvider>
    </Provider>
  );
}
