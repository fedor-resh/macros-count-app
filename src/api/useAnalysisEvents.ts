import { notifications } from "@mantine/notifications";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import { useEffect } from "react";
import { API_URL, getAccessToken } from "../lib/apiClient";
import { queryClient as appQueryClient } from "../lib/queryClient";
import { useAuthStore } from "../stores/authStore";
import { foodKeys } from "./foodKey";
import { isPendingAnalysis, untrackPendingAnalysis } from "./photoAnalysisTracker";

interface AnalysisEvent {
	id: number;
	status: "pending" | "completed" | "error";
	name: string;
}

// SSE-подписка на статусы анализа фото — замена Supabase Realtime.
// Сервер шлёт событие "analysis", когда фоновой анализ завершился.
export function useAnalysisEvents() {
	const userId = useAuthStore((state) => state.user?.id);

	useEffect(() => {
		if (!userId) {
			return;
		}

		const controller = new AbortController();

		void fetchEventSource(`${API_URL}/events`, {
			signal: controller.signal,
			// Пауза при скрытой вкладке; при возврате onopen снова инвалидирует кэш.
			openWhenHidden: false,
			// Токен подставляется на каждую (пере)попытку — переживает refresh сессии.
			fetch: async (input, init) => {
				const token = await getAccessToken();
				const headers = new Headers(init?.headers);
				headers.set("Authorization", `Bearer ${token}`);
				return fetch(input, { ...init, headers });
			},
			onopen: async (response) => {
				if (!response.ok) {
					throw new Error(`SSE connection failed: ${response.status}`);
				}
				// Пока соединения не было, события могли потеряться — пересинхронизация.
				void appQueryClient.invalidateQueries({ queryKey: foodKeys.all });
			},
			onmessage: (message) => {
				if (message.event !== "analysis") {
					return;
				}

				const current = JSON.parse(message.data) as AnalysisEvent;
				if (current.status !== "completed" && current.status !== "error") {
					return;
				}

				void appQueryClient.invalidateQueries({ queryKey: foodKeys.all });

				if (!isPendingAnalysis(current.id)) {
					return;
				}
				untrackPendingAnalysis(current.id);

				if (current.status === "completed") {
					notifications.show({
						title: "Фото проанализировано",
						message: `Добавлен продукт: ${current.name}`,
						color: "green",
					});
				} else {
					notifications.show({
						title: "Ошибка анализа",
						message: "Не удалось распознать фото. Попробуйте еще раз.",
						color: "red",
					});
				}
			},
			onerror: () => {
				// Возврат интервала (мс) запускает переподключение вместо остановки.
				return 5000;
			},
		});

		return () => controller.abort();
	}, [userId]);
}
