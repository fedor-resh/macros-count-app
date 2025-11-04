import { Box, Card, Group, Stack, Text } from "@mantine/core";
import type { EatenProduct } from "@/types/types";
import { FullscreenImage } from "./FullscreenImage";

interface FoodListProps {
	items: EatenProduct[];
	onItemClick?: (index: number) => void;
}

function isValidFoodItem(item: EatenProduct): boolean {
	return !!item.value && !!item.kcalories && !!item.protein;
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
					<Card
						key={item.id}
						p="sm"
						radius="md"
						bd={isValidFoodItem(item) ? "none" : "1px solid orange"}
						onClick={() => onItemClick?.(index)}
					>
						<Group gap="md" justify="space-between" align="start" wrap="nowrap">
							<div>
								<Text fw={550}>{item.name}</Text>
								<Group gap="md">
									<Text span inherit c="#d9d9d9" w={50}>
										{item.value ? `${item.value}г` : "-"}
									</Text>
									<Text span inherit c="#ff7428" w={50}>
										{item.kcalories ? `${item.kcalories}к` : "-"}
									</Text>
									<Text span inherit c="#3d7cff" w={50}>
										{item.protein ? `${item.protein}г` : "-"}
									</Text>
								</Group>
							</div>
							{item.image_url && (
								<Box
									style={{ marginRight: -12, marginTop: -12, marginBottom: -12 }}
									onClick={(e) => e.stopPropagation()}
								>
									<FullscreenImage src={item.image_url} />
								</Box>
							)}
						</Group>
					</Card>
				))}
		</Stack>
	);
}
