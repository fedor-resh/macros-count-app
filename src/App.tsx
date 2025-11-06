import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/notifications/styles.css";

import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useEffect } from "react";
import { persister, queryClient } from "./lib/queryClient";
import { Router } from "./Router";
import { useAuthStore } from "./stores/authStore";
import { theme } from "./theme";

export default function App() {
	const initialize = useAuthStore((state) => state.initialize);

	useEffect(() => {
		initialize();
	}, [initialize]);

	return (
		<PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
			<MantineProvider theme={theme} defaultColorScheme="dark">
				<Notifications position="top-right" />
				<Router />
			</MantineProvider>
		</PersistQueryClientProvider>
	);
}
