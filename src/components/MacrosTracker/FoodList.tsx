import { Group, Stack, Text } from "@mantine/core";
import type { EatenProduct } from "@/types/types";
import { FoodItem } from "./FoodItem";

interface FoodListProps {
	items: EatenProduct[];
	onItemClick?: (index: number) => void;
}

export function FoodList({ items, onItemClick }: FoodListProps) {
	return (
		<Stack gap="xs">
				{/* Header */}
				<Group gap="md">
					<Text c="#d9d9d9" ml="md" w={50}>
						Вес
					</Text>
					<Text c="#ff7428" w={50}>
						Кал
					</Text>
					<Text c="#3d7cff" w={50}>
						Белки
					</Text>
				</Group>

				{/* Food Items */}
				{items.length === 0 && (
					<Text size="md" c="#d9d9d9" style={{ width: "100%" }}>
						Нет продуктов
					</Text>
				)}
				{items.map((item, index) => (
					<FoodItem
						key={item.id}
						item={item}
						index={index}
						onItemClick={onItemClick}
					/>
				))}
		</Stack>
	);
}
