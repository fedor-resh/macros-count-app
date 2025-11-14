import { Badge, Box, Group, Paper, Skeleton, Stack, Text } from "@mantine/core";
import { useLayoutEffect, useRef, useState } from "react";
import type { EatenProduct } from "../../types/types";
import { FullscreenImage } from "../MacrosTracker/FullscreenImage";
import { LoadingText } from "../ui";
import type { FoodItem as FoodItemType } from "./types";

function isValidFoodItem(item: EatenProduct): boolean {
	return !!item.value && !!item.kcalories && !!item.protein;
}

export interface FoodItemProps {
	item: FoodItemType;
	index: number;
	onItemClick?: (index: number) => void;
}

export function FoodItem({ item, index, onItemClick }: FoodItemProps) {
	const cardRef = useRef<HTMLDivElement>(null);
	const [cardHeight, setCardHeight] = useState<number>(0);
	const isLoading = item.name === "Анализируем фото...";

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
			onClick={() => !isLoading && onItemClick?.(index)}
			ref={cardRef}
			className={isLoading ? "breathing-border" : undefined}
		>
			<Group gap="md" justify="space-between" align="start" wrap="nowrap">
				<Stack gap={5}>
					{isLoading ? <LoadingText text="Анализируем фото" /> : <Text fw={550}>{item.name}</Text>}
					<Group gap="md">
						{isLoading ? (
							<>
								<Skeleton height={22} width={60} radius="sm" />
								<Skeleton height={22} width={60} radius="sm" />
								<Skeleton height={22} width={60} radius="sm" />
							</>
						) : (
							<>
								<Badge variant="light" color="dark.1">
									{item.value ? `${item.value} г` : "-"}
								</Badge>
								<Badge variant="light" color="orange.9">
									{item.kcalories ? `${item.kcalories} к` : "-"}
								</Badge>
								<Badge variant="light" color="blue.6">
									{item.protein ? `${item.protein} б` : "-"}
								</Badge>
								{item.badges}
							</>
						)}
					</Group>
				</Stack>
				{"imageUrl" in item && item.imageUrl && (
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
