import { Group, Image, Paper, Stack, Text } from "@mantine/core";

export interface FoodItem {
	id: string;
	image_url: string | null;
	name: string;
	weight: string;
	calories: string;
	protein: string;
}

interface FoodListProps {
	items: FoodItem[];
	onItemClick?: (index: number) => void;
}

function isItemValid(item: FoodItem): boolean {
	return !!item.weight && !!item.calories && !!item.protein;
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
				<Paper
					key={item.id}
					bg="#2a2a2a"
					p="sm"
					radius="md"
					bd={isItemValid(item) ? "1px solid #2a2a2a" : "none"}
					style={{
						cursor: onItemClick ? "pointer" : "default",
						transition: "background-color 0.2s ease",
						overflow: "hidden",
					}}
					onClick={() => onItemClick?.(index)}
					onMouseEnter={(e) => {
						if (onItemClick) {
							e.currentTarget.style.backgroundColor = "#333333";
						}
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.backgroundColor = "#2a2a2a";
					}}
				>
					<Group gap="md" justify="space-between" align="start" wrap="nowrap">
						<div>
							<Text fw={550}>{item.name}</Text>
							<Group gap="md">
								<Text span inherit c="#d9d9d9" w={50}>
									{item.weight}
								</Text>
								<Text span inherit c="#ff7428" w={50}>
									{item.calories}
								</Text>
								<Text span inherit c="#3d7cff" w={50}>
									{item.protein}
								</Text>
							</Group>
						</div>
						{item.image_url && (
							<Image
								src={item.image_url}
								alt={item.name}
								height={80}
								mr={-12}
								my={-12}
							/>
						)}
					</Group>
				</Paper>
			))}
		</Stack>
	);
}
