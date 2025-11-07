import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ProtectedRoute } from "./components/Auth/ProtectedRoute";
import { AppLayout } from "./components/Layout/AppLayout";
import { AboutPage } from "./pages/About.page";
import { HomePage } from "./pages/Home.page";
import { LoginPage } from "./pages/Login.page";
import { ProfilePage } from "./pages/Profile.page";
import { SandboxPage } from "./pages/Sandbox.page";

const router = createBrowserRouter([
	{
		path: "/login",
		element: <LoginPage />,
	},
	{
		path: "/",
		element: (
			<ProtectedRoute>
				<AppLayout />
			</ProtectedRoute>
		),
		children: [
			{
				path: "/",
				element: <HomePage />,
			},
			{
				path: "/about",
				element: <AboutPage />,
			},
			{
				path: "/profile",
				element: <ProfilePage />,
			},
			{
				path: "/sandbox",
				element: <SandboxPage />,
			},
		],
	},
]);

export function Router() {
	return <RouterProvider router={router} />;
}
