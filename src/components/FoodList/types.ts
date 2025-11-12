import type { EatenProduct } from "../../types/types";

export type FoodItem = EatenProduct & {
	badges?: React.ReactNode;
};
