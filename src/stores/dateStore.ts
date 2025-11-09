import { create } from "zustand";
import { getFormattedDate } from "../utils/dateUtils";
import { startTransition } from "@/utils/viewTransition";
interface DateState {
	selectedDate: string;
	setSelectedDate: (date: string) => void;
}

export const useDateStore = create<DateState>((set) => ({
	selectedDate: getFormattedDate(new Date()),
	setSelectedDate: (date) => set({ selectedDate: date }),
}));
