import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
	const session = useAuthStore((state) => state.session);
	const loading = useAuthStore((state) => state.loading);

	if (!session && !loading) {
		return <Navigate to="/login" replace />;
	}

	return <>{children}</>;
}
