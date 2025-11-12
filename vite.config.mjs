import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
	plugins: [
		react({
			babel: {
				plugins: [["babel-plugin-react-compiler", {}]],
			},
		}),
		tsconfigPaths(),
		VitePWA({
			registerType: "autoUpdate",
			includeAssets: ["favicon.svg"],
			manifest: {
				name: "Macros Count App",
				short_name: "Macros",
				description: "Track your daily macros and calories",
				background_color: "#242424",
				theme_color: "#242424",
				display: "standalone",
				icons: [
					{
						src: "/favicon.svg",
						sizes: "512x512",
						type: "image/svg+xml",
						purpose: "any maskable",
					},
				],
			},
			workbox: {
				globPatterns: ["**/*.{js,css,html,ico,png,svg,webp}"],
				runtimeCaching: [
					{
						urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
						handler: "NetworkFirst",
						options: {
							cacheName: "supabase-cache",
							expiration: {
								maxEntries: 50,
								maxAgeSeconds: 60 * 60 * 24, // 24 hours
							},
							cacheableResponse: {
								statuses: [0, 200],
							},
						},
					},
				],
			},
			devOptions: {
				enabled: true,
			},
		}),
	],
	test: {
		globals: true,
		environment: "jsdom",
		setupFiles: "./vitest.setup.mjs",
	},
	build: {
		rollupOptions: {
			output: {
				manualChunks: {
					// React core
					"react-vendor": ["react", "react-dom"],
					// React Router
					"react-router": ["react-router-dom"],
					// Mantine UI components
					"mantine-core": ["@mantine/core"],
					"mantine-hooks": ["@mantine/hooks", "@mantine/form"],
					// Icons
					icons: ["@tabler/icons-react"],
					// TanStack Query
					"react-query": ["@tanstack/react-query"],
					// Supabase
					supabase: ["@supabase/supabase-js"],
				},
			},
		},
		chunkSizeWarningLimit: 600,
	},
	server: {
		port: 5173,
		host: true,
	},
});
