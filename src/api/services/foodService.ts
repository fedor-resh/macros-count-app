import { api } from "@/lib/apiClient";
import type { EatenProduct } from "@/types/types";

export const foodService = {
	async getFoodInRange(fromDate: string, toDate: string): Promise<EatenProduct[]> {
		const params = new URLSearchParams({ from: fromDate, to: toDate });
		return api.get<EatenProduct[]>(`/eaten-products?${params}`);
	},
};
