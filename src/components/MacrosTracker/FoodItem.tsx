import { Badge, Box, Card, Group, Paper, Stack, Text } from "@mantine/core";
import { useLayoutEffect, useRef, useState } from "react";
import type { EatenProduct } from "@/types/types";
import { FullscreenImage } from "./FullscreenImage";

function isValidFoodItem(item: EatenProduct): boolean {
	return !!item.value && !!item.kcalories && !!item.protein;
}

interface FoodItemProps {
	item: EatenProduct;
	index: number;
	onItemClick?: (index: number) => void;
}

export function FoodItem({ item, index, onItemClick }: FoodItemProps) {
	const cardRef = useRef<HTMLDivElement>(null);
	const [cardHeight, setCardHeight] = useState<number>(0);

	useLayoutEffect(() => {
		if (cardRef.current) {
			setCardHeight(cardRef.current.offsetHeight);
		}
	}, []);

	return (
		<Paper
			p="sm"
			withBorder
			bd={isValidFoodItem(item) ? "1px solid var(--mantine-color-dark-6)" : "1px solid orange"}
			onClick={() => onItemClick?.(index)}
			ref={cardRef}
		>
			<Group gap="md" justify="space-between" align="start" wrap="nowrap">
				<Stack gap={5}>
					<Text fw={550}>{item.name}</Text>
					<Group gap="md">
						{/* <Text span inherit c="dark.1" w={50}>
							{item.value ? `${item.value}г` : "-"}
						</Text>
						<Text span inherit c="orange.9" w={50} fw={400}>
							{item.kcalories ? `${item.kcalories}к` : "-"}
						</Text>
						<Text span inherit c="blue.6" w={50}>
							{item.protein ? `${item.protein}г` : "-"}
						</Text> */}
						<Badge variant="light" color="dark.1" >
							{item.value ? `${item.value}г` : "-"}
						</Badge>
						<Badge variant="light" color="orange.9">
							{item.kcalories ? `${item.kcalories}к` : "-"}
						</Badge>
						<Badge variant="light" color="blue.6">
							{item.protein ? `${item.protein} г` : "-"}
						</Badge>
					</Group>
				</Stack>
				{item.imageUrl && (
					<Box
						style={{
							marginRight: -12,
							marginTop: -12,
							marginBottom: -12,
							width: 80,
						}}
						onClick={(e) => e.stopPropagation()}
					>
						<FullscreenImage src={item.imageUrl} style={{ height: cardHeight || 60, width: 80 }} />
					</Box>
				)}
			</Group>
		</Paper>
	);
}
