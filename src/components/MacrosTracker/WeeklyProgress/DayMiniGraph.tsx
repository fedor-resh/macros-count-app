import { ActionIcon, Box, RingProgress, Stack, Text } from "@mantine/core";
import type { DayProgress } from "./types";

export function DayMiniGraph({
	day,
	caloriesPercent,
	proteinPercent,
	caloriesOverflowPercent,
	proteinOverflowPercent,
	caloriesExceeded,
	proteinExceeded,
	isActive,
	onClick,
}: DayProgress) {
	const content = (
		<Stack gap={4} align="center">
			<Box pos="relative" style={{ width: 30, height: 30 }}>
				{caloriesExceeded ? (
					<RingProgress
						size={30}
						thickness={2}
						sections={[
							{ value: 100 - caloriesOverflowPercent, color: "transparent" },
							{ value: caloriesOverflowPercent, color: "#AA0000" },
						]}
						style={{
							position: "absolute",
							top: "50%",
							left: "50%",
							transform: "translate(-50%, -50%) scaleX(-1)",
							zIndex: 3,
						}}
					/>
				) : null}

				<RingProgress
					size={30}
					thickness={2}
					sections={[
						{ value: Math.min(caloriesPercent, 100), color: "orange.6" },
						{ value: 100 - Math.min(caloriesPercent, 100), color: "gray.8" },
					]}
					style={{
						position: "absolute",
						top: "50%",
						left: "50%",
						transform: "translate(-50%, -50%)",
						zIndex: 2,
					}}
				/>

				{proteinExceeded ? (
					<RingProgress
						size={20}
						thickness={2}
						sections={[
							{ value: 100 - proteinOverflowPercent, color: "transparent" },
							{ value: proteinOverflowPercent, color: "blue.9" },
						]}
						style={{
							position: "absolute",
							top: "50%",
							left: "50%",
							transform: "translate(-50%, -50%) scaleX(-1)",
							zIndex: 3,
						}}
					/>
				) : null}

				<RingProgress
					size={20}
					thickness={2}
					sections={[
						{ value: Math.min(proteinPercent, 100), color: "blue.6" },
						{ value: 100 - Math.min(proteinPercent, 100), color: "gray.8" },
					]}
					style={{
						position: "absolute",
						top: "50%",
						left: "50%",
						transform: "translate(-50%, -50%)",
						zIndex: 2,
					}}
				/>
			</Box>

			<Text size="13px" c={isActive ? "dark.1" : "dark.2"} fw={isActive ? 700 : 400}>
				{day}
			</Text>
		</Stack>
	);

	return (
		<ActionIcon
			variant={isActive ? "light" : "transparent"}
			radius="md"
			size="xl"
			py={30}
			onClick={onClick}
			style={{ cursor: "pointer" }}
		>
			{content}
		</ActionIcon>
	);
}
