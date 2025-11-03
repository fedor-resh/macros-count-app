import { create } from "zustand";

interface DateState {
	selectedDate: string | null;
	setSelectedDate: (date: string | null) => void;
}

export const useDateStore = create<DateState>((set) => ({
	selectedDate: new Date().toISOString().split("T")[0],
	setSelectedDate: (date) => set({ selectedDate: date }),
}));
