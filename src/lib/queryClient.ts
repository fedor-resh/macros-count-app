import { QueryClient } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 1000 * 60 * 5, // 5 minutes
			gcTime: 1000 * 60 * 60 * 24, // 24 hours
			refetchOnWindowFocus: false,
			retry: 1,
		},
		mutations: {
			retry: 1,
		},
	},
});

export const persister = createAsyncStoragePersister({
	storage: window.localStorage,
});
