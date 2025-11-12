import { Box, Card, Group, Skeleton } from "@mantine/core";

export function FoodItemLoader() {
	return (
		<Card p="sm" radius="md" withBorder bd="1px solid var(--mantine-color-dark-6)">
			<Group gap="md" justify="space-between" align="start" wrap="nowrap">
				<div style={{ flex: 1 }}>
					<Skeleton height={20} width="60%" mb={8} />
					<Group gap="md">
						<Skeleton height={16} width={50} />
						<Skeleton height={16} width={50} />
						<Skeleton height={16} width={50} />
					</Group>
				</div>
				<Box style={{ marginRight: -12, marginTop: -12, marginBottom: -12 }}>
					<Skeleton height={70} width={80} radius={0} />
				</Box>
			</Group>
		</Card>
	);
}
