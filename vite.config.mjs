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
				name: "Bite",
				short_name: "Bite",
				description: "Track your daily macros and calories",
				background_color: "#242424",
				theme_color: "#242424",
				display: "standalone",
				icons: [
					{
						src: "https://macros-count-app.fedorresh.ru/android/android-launchericon-48-48.png",
						sizes: "48x48",
						type: "image/png",
						purpose: "any",
					},
					{
						src: "https://macros-count-app.fedorresh.ru/android/android-launchericon-72-72.png",
						sizes: "72x72",
						type: "image/png",
						purpose: "any",
					},
					{
						src: "https://macros-count-app.fedorresh.ru/android/android-launchericon-96-96.png",
						sizes: "96x96",
						type: "image/png",
						purpose: "any",
					},
					{
						src: "https://macros-count-app.fedorresh.ru/android/android-launchericon-144-144.png",
						sizes: "144x144",
						type: "image/png",
						purpose: "any",
					},
					{
						src: "https://macros-count-app.fedorresh.ru/android/android-launchericon-192-192.png",
						sizes: "192x192",
						type: "image/png",
						purpose: "any maskable",
					},
					{
						src: "https://macros-count-app.fedorresh.ru/android/android-launchericon-512-512.png",
						sizes: "512x512",
						type: "image/png",
						purpose: "any maskable",
					},
				],
			},
			workbox: {
				globPatterns: ["**/*.{js,css,html,ico,png,svg,webp}"],
				// Запросы к Go API (особенно SSE /api/v1/events) не должны
				// перехватываться навигационным fallback сервис-воркера.
				navigateFallbackDenylist: [/^\/api\//],
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
					{
						// Картинки еды с собственного бэкенда (Фаза 3): имена файлов
						// с таймстемпом, никогда не меняются — можно кэшировать надолго.
						urlPattern: /\/images\/.+\.(png|jpe?g|webp|heic)$/i,
						handler: "CacheFirst",
						options: {
							cacheName: "images-cache",
							expiration: {
								maxEntries: 200,
								maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
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
		coverage: {
			provider: "v8",
			reporter: ["text", "html", "json-summary"],
			include: [
				"src/utils/**/*.ts",
				"src/api/foodQueries.ts",
				"supabase/functions/analyze-food-photo/responseAdapter.ts",
				"supabase/functions/analyze-food-photo/parser.ts",
				"supabase/functions/analyze-food-photo/llmProvider.ts",
				"supabase/functions/analyze-food-photo/llm.ts",
			],
			exclude: [
				"src/utils/imageCompression.ts",
				"src/utils/viewTransition.ts",
				"**/*.test.ts",
				"**/*.types.ts",
			],
		},
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
		host: "0.0.0.0", // Allow access from network devices
		strictPort: false, // Try next available port if 5173 is in use
		hmr: {
			clientPort: 5173, // HMR client port (for WebSocket)
		},
		proxy: {
			// Go-бэкенд в dev-режиме: тот же origin, без CORS
			"/api": {
				target: "http://localhost:8080",
				changeOrigin: true,
			},
			// Картинки с диска (STORAGE_DRIVER=disk) отдаёт тоже Go
			"/images": {
				target: "http://localhost:8080",
				changeOrigin: true,
			},
		},
	},
});
