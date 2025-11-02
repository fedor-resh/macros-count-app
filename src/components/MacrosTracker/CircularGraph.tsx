import { IconFlame, IconMeat } from "@tabler/icons-react";
import { Box, Group, RingProgress, Stack, Text } from "@mantine/core";

interface CircularGraphProps {
	calories: number;
	protein: number;
	caloriesGoal?: number;
	proteinGoal?: number;
}

export function CircularGraph({
	calories,
	protein,
	caloriesGoal = 3000,
	proteinGoal = 150,
}: CircularGraphProps) {
	const caloriesPercent = (calories / caloriesGoal) * 100;
	const proteinPercent = (protein / proteinGoal) * 100;
	const caloriesExceeded = calories > caloriesGoal;
	const proteinExceeded = protein > proteinGoal;
	const caloriesOverflowPercent = caloriesExceeded
		? Math.min(((calories - caloriesGoal) / caloriesGoal) * 100, 100)
		: 0;
	const proteinOverflowPercent = proteinExceeded
		? Math.min(((protein - proteinGoal) / proteinGoal) * 100, 100)
		: 0;

	return (
		<Stack align="center" gap="lg">
			<Box pos="relative" style={{ width: 200, height: 200 }}>
				<RingProgress
					transitionDuration={300}
					style={{
						position: "absolute",
						top: "50%",
						left: "50%",
						transform: "translate(-50%, -50%) scaleX(-1)",
						zIndex: 3,
						opacity: caloriesExceeded ? 1 : 0,
					}}
					size={200}
					thickness={12}
					roundCaps
					sections={[
						{ value: 100 - caloriesOverflowPercent, color: "transparent" },
						{ value: caloriesOverflowPercent, color: "#AA0000" },
					]}
				/>
				{/* Main calories ring */}
				<RingProgress
					transitionDuration={300}
					style={{
						position: "absolute",
						top: "50%",
						left: "50%",
						transform: "translate(-50%, -50%) scaleX(-1)",
						zIndex: 2,
					}}
					size={200}
					thickness={12}
					roundCaps
					sections={[
						{ value: 100 - Math.min(caloriesPercent, 100), color: "gray.8" },
						{ value: Math.min(caloriesPercent, 100), color: "orange.6" },
					]}
				/>
				<RingProgress
					transitionDuration={300}
					size={156}
					thickness={12}
					roundCaps
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
						opacity: proteinExceeded ? 1 : 0,
					}}
				/>
				{/* Main protein ring */}
				<RingProgress
					transitionDuration={300}
					size={156}
					thickness={12}
					roundCaps
					sections={[
						{ value: 100 - Math.min(proteinPercent, 100), color: "gray.8" },
						{ value: Math.min(proteinPercent, 100), color: "blue.6" },
					]}
					style={{
						position: "absolute",
						top: "50%",
						left: "50%",
						transform: "translate(-50%, -50%) scaleX(-1)",
						zIndex: 2,
					}}
				/>
				<Stack
					gap={0}
					align="center"
					style={{
						position: "absolute",
						top: "50%",
						left: "50%",
						transform: "translate(-50%, -50%)",
					}}
				>
					<Text size="40px" fw={500} c="orange.6">
						{calories}
					</Text>
					<Text size="25px" fw={400} c="#3d7cff">
						{protein}
					</Text>
				</Stack>
			</Box>

			<Group gap="md">
				<Group gap={4}>
					<IconFlame size={20} color="#ff7428" />
					<Text size="sm" c="#d9d9d9">
						ККаллории
					</Text>
				</Group>
				<Group gap={4}>
					<IconMeat size={20} color="#3d7cff" />
					<Text size="sm" c="#d9d9d9">
						Белки
					</Text>
				</Group>
			</Group>
		</Stack>
	);
}
