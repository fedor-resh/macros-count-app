import { Center, Loader } from "@mantine/core";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { refreshSession } from "../lib/authClient";
import { useAuthStore } from "../stores/authStore";

export function AuthCallbackPage() {
	const navigate = useNavigate();
	const setUser = useAuthStore((state) => state.setUser);

	useEffect(() => {
		let cancelled = false;
		void (async () => {
			const session = await refreshSession();
			if (cancelled) {
				return;
			}
			if (session) {
				setUser(session.user);
				navigate("/", { replace: true });
			} else {
				navigate("/login", { replace: true });
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [navigate, setUser]);

	return (
		<Center h="100vh">
			<Loader />
		</Center>
	);
}
