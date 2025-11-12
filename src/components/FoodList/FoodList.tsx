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
	const isFetching = useIsFetching({ queryKey: foodKeys.all });
	const isUploadingPhoto = useIsMutating({ mutationKey: ["uploadPhoto"] });
	const isInvalidating = isFetching > 0 || isUploadingPhoto > 0;

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
				<Text size="md" c="#d9d9d9" style={{ width: "100%" }}>
					Нет продуктов
				</Text>
			)}
			{isInvalidating && <FoodItemLoader />}
			{items.map((item, index) => (
				<div key={item.id}>
					<FoodItem item={item} index={index} onItemClick={onItemClick} />
				</div>
			))}
		</Stack>
	);
}
