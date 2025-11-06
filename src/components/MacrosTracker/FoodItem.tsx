import { Box, Card, Group, Text } from "@mantine/core";
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
		<Card
			p="sm"
			radius="md"
			bd={isValidFoodItem(item) ? "none" : "1px solid orange"}
			onClick={() => onItemClick?.(index)}
			ref={cardRef}
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
		</Card>
	);
}
