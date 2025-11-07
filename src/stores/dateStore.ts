import { create } from "zustand";
import { startTransition } from "react";
import { getFormattedDate } from "../utils/dateUtils";
interface DateState {
	selectedDate: string | null;
	setSelectedDate: (date: string | null) => void;
}

export const useDateStore = create<DateState>((set) => ({
	selectedDate: getFormattedDate(new Date()),
	setSelectedDate: (date) => startTransition(() => set({ selectedDate: date })),
}));
