import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { ProtectedRoute } from './components/Auth/ProtectedRoute';
import { AppLayout } from './components/Layout/AppLayout';
import { AboutPage } from './pages/About.page';
import { HomePage } from './pages/Home.page';
import { LoginPage } from './pages/Login.page';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: '/',
        element: <HomePage />,
      },
      {
        path: '/about',
        element: <AboutPage />,
      },
    ],
  },
]);

export function Router() {
  return <RouterProvider router={router} />;
}
