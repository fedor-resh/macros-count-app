import { create } from "zustand";
import { persist } from "zustand/middleware";

interface DateState {
	selectedDate: string | null;
	setSelectedDate: (date: string | null) => void;
}

export const useDateStore = create<DateState>()(
	persist(
		(set) => ({
			selectedDate: new Date().toISOString().split("T")[0],
			setSelectedDate: (date) => set({ selectedDate: date }),
		}),
		{
			name: "date-storage",
		},
	),
);
