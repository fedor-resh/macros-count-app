import { Group, Stack, Text } from "@mantine/core";
import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { foodKeys } from "../../api/foodQueries";
import { FoodItem } from "./FoodItem";
import { FoodItemLoader } from "./FoodItemLoader";
import type { FoodItem as FoodItemType } from "./types";

export interface FoodListProps {
	items: FoodItemType[];
	onItemClick?: (index: number) => void;
	isLoading?: boolean;
}

export function FoodList({ items, onItemClick, isLoading }: FoodListProps) {
	if (isLoading) {
		return (
			<Stack gap="xs">
				<FoodItemLoader />
				<FoodItemLoader />
				<FoodItemLoader />
			</Stack>
		);
	}

	return (
		<Stack gap="xs">
			{items.length === 0 && (
				<Text size="md" c="#d9d9d9" style={{ width: "100%" }} ta="center" w="100%">
					Нет продуктов
				</Text>
			)}
			{items.map((item, index) => (
				<div key={item.id}>
					<FoodItem item={item} index={index} onItemClick={onItemClick} />
				</div>
			))}
		</Stack>
	);
}
