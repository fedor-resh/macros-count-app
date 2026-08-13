import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
	const user = useAuthStore((state) => state.user);
	const loading = useAuthStore((state) => state.loading);

	if (!user && !loading) {
		return <Navigate to="/login" replace />;
	}

	return <>{children}</>;
}
