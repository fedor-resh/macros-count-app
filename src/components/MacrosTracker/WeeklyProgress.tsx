import { ActionIcon, Box, Group, Paper, RingProgress, Stack, Text } from "@mantine/core";
import { useMemo } from "react";
import { useGetWeeklyFoodsQuery } from "../../api/foodQueries";
import { useDateStore } from "../../stores/dateStore";
import { getFormattedDate } from "../../utils/dateUtils";

interface DayProgress {
	day: string;
	date: string;
	caloriesPercent: number;
	proteinPercent: number;
	caloriesOverflowPercent: number;
	proteinOverflowPercent: number;
	caloriesExceeded: boolean;
	proteinExceeded: boolean;
	isActive: boolean;
	onClick: () => void;
}

interface WeeklyProgressProps {
	caloriesGoal?: number;
	proteinGoal?: number;
}

function DayMiniGraph({
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
				{/* Overflow ring for calories (red) - shown above if exceeded */}
				{caloriesExceeded && (
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
				)}
				{/* Main calories ring */}
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
				{/* Overflow ring for protein (deep blue) - shown above if exceeded */}
				{proteinExceeded && (
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
				)}
				{/* Main protein ring */}
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

export function WeeklyProgress({ caloriesGoal = 3000, proteinGoal = 150 }: WeeklyProgressProps) {
	const { selectedDate, setSelectedDate } = useDateStore();

	const { data: weeklyFoods = [] } = useGetWeeklyFoodsQuery(selectedDate);

	const weekDays: DayProgress[] = useMemo(() => {
		// Generate week starting from Monday for the selected date
		const days: DayProgress[] = [];
		const currentDate = selectedDate ? new Date(selectedDate) : new Date();

		// Find Monday of the week containing selectedDate
		const currentDay = currentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
		const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1; // If Sunday, go back 6 days
		const monday = new Date(currentDate);
		monday.setDate(currentDate.getDate() - daysFromMonday);

		for (let i = 0; i < 7; i++) {
			const date = new Date(monday);
			date.setDate(monday.getDate() + i);
			const dateStr = getFormattedDate(date);
			const dayName = date.toLocaleDateString("ru-RU", { weekday: "short" }).toUpperCase();

			// Calculate totals for this day
			const dayFoods = weeklyFoods.filter((food) => food.date === dateStr);
			const totalCalories = dayFoods.reduce(
				(sum, item) => sum + ((item.kcalories! * item.value!) / 100 || 0),
				0,
			);
			const totalProtein = dayFoods.reduce(
				(sum, item) => sum + ((item.protein! * item.value!) / 100 || 0),
				0,
			);

			// Calculate percentages (cap at 100%)
			const caloriesPercent = Math.min(Math.round((totalCalories / caloriesGoal) * 100), 100);
			const proteinPercent = Math.min(Math.round((totalProtein / proteinGoal) * 100), 100);

			// Check if goals are exceeded
			const caloriesExceeded = totalCalories > caloriesGoal;
			const proteinExceeded = totalProtein > proteinGoal;

			// Calculate overflow percentages
			const caloriesOverflowPercent = caloriesExceeded
				? Math.min(Math.round(((totalCalories - caloriesGoal) / caloriesGoal) * 100), 100)
				: 0;
			const proteinOverflowPercent = proteinExceeded
				? Math.min(Math.round(((totalProtein - proteinGoal) / proteinGoal) * 100), 100)
				: 0;

			days.push({
				day: dayName,
				date: dateStr,
				caloriesPercent,
				proteinPercent,
				caloriesOverflowPercent,
				proteinOverflowPercent,
				caloriesExceeded,
				proteinExceeded,
				isActive: dateStr === selectedDate,
				onClick: () => setSelectedDate(dateStr),
			});
		}

		return days;
	}, [weeklyFoods, selectedDate, setSelectedDate, caloriesGoal, proteinGoal]);

	return (
				<Group gap="0" justify="space-between">
					{weekDays.map((dayData) => (
						<DayMiniGraph key={dayData.date} {...dayData} />
					))}
				</Group>
	);
}
