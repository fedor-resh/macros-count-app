import { create } from "zustand";

export interface ProductDrawerProduct {
	id?: number;
	name: string;
	value?: number | null;
	kcalories?: number | null;
	protein?: number | null;
	unit?: string | null;
	date?: string | null;
}

type DrawerMode = "add" | "edit";

interface ProductDrawerState {
	opened: boolean;
	mode: DrawerMode;
	product: ProductDrawerProduct | null;
	openForAdd: (product?: ProductDrawerProduct) => void;
	openForEdit: (product: ProductDrawerProduct & { id: number }) => void;
	close: () => void;
}

export const useProductDrawerStore = create<ProductDrawerState>((set) => ({
	opened: false,
	mode: "add",
	product: null,

	openForAdd: (product) => {
		set({ opened: true, mode: "add", product: product ?? null });
	},

	openForEdit: (product) => {
		set({ opened: true, mode: "edit", product });
	},

	close: () => {
		set({ opened: false, product: null });
	},
}));
