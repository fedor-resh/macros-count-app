import { ActionIcon, Group } from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { getMondayOfWeek, useGetWeeklyFoodsQuery } from "../../../api/foodQueries";
import { useDateStore } from "../../../stores/dateStore";
import { getFormattedDate } from "../../../utils/dateUtils";
import { DayMiniGraph } from "./DayMiniGraph";
import type { DayProgress } from "./types";

export interface WeeklyProgressProps {
	caloriesGoal?: number;
	proteinGoal?: number;
}

function createWeekDays({
	caloriesGoal,
	proteinGoal,
	referenceMonday,
	selectedDate,
	setSelectedDate,
	weeklyFoods,
}: {
	caloriesGoal: number;
	proteinGoal: number;
	referenceMonday: string;
	selectedDate: string | null;
	setSelectedDate: (date: string) => void;
	weeklyFoods: Array<{
		date?: string | null;
		kcalories?: number | null;
		protein?: number | null;
		value?: number | null;
	}>;
}): DayProgress[] {
	const days: DayProgress[] = [];
	const monday = new Date(referenceMonday);

	if (Number.isNaN(monday.getTime())) {
		return days;
	}

	for (let i = 0; i < 7; i++) {
		const date = new Date(monday);
		date.setDate(monday.getDate() + i);
		const dateStr = getFormattedDate(date);
		const dayName = date.toLocaleDateString("ru-RU", { weekday: "short" }).toUpperCase();

		const dayFoods = weeklyFoods.filter((food) => food.date === dateStr);

		const totalCalories = dayFoods.reduce((sum, item) => {
			const kcalories = item.kcalories ?? 0;
			const value = item.value ?? 0;
			return sum + (kcalories * value) / 100;
		}, 0);
		const totalProtein = dayFoods.reduce((sum, item) => {
			const protein = item.protein ?? 0;
			const value = item.value ?? 0;
			return sum + (protein * value) / 100;
		}, 0);

		const caloriesPercent = Math.min(Math.round((totalCalories / caloriesGoal) * 100), 100);
		const proteinPercent = Math.min(Math.round((totalProtein / proteinGoal) * 100), 100);

		const caloriesExceeded = totalCalories > caloriesGoal;
		const proteinExceeded = totalProtein > proteinGoal;

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
}

export function WeeklyProgress({ caloriesGoal = 3000, proteinGoal = 150 }: WeeklyProgressProps) {
	const { selectedDate, setSelectedDate } = useDateStore();
	const [referenceMonday, setReferenceMonday] = useState<string>(() =>
		getMondayOfWeek(selectedDate ?? getFormattedDate()),
	);

	useEffect(() => {
		const monday = getMondayOfWeek(selectedDate ?? getFormattedDate());
		setReferenceMonday((prev: string) => (prev === monday ? prev : monday));
	}, [selectedDate]);

	const { data: weeklyFoods = [] } = useGetWeeklyFoodsQuery(referenceMonday);

	const weekDays = useMemo(
		() =>
			createWeekDays({
				caloriesGoal,
				proteinGoal,
				referenceMonday,
				selectedDate,
				setSelectedDate,
				weeklyFoods,
			}),
		[caloriesGoal, proteinGoal, referenceMonday, selectedDate, setSelectedDate, weeklyFoods],
	);

	const handleWeekChange = (direction: number) => {
		const baseForSelection = selectedDate ? new Date(selectedDate) : new Date(referenceMonday);
		baseForSelection.setDate(baseForSelection.getDate() + direction * 7);
		setSelectedDate(getFormattedDate(baseForSelection));

		setReferenceMonday((prev: string) => {
			const mondayDate = new Date(prev);
			mondayDate.setDate(mondayDate.getDate() + direction * 7);
			return getFormattedDate(mondayDate);
		});
	};

	return (
		<Group gap={0} align="center" justify="space-between" wrap="nowrap">
			<ActionIcon
				variant="subtle"
				c="dark.4"
				aria-label="Предыдущая неделя"
				onClick={() => handleWeekChange(-1)}
				size="md"
				mx={-5}
			>
				<IconChevronLeft size={18} />
			</ActionIcon>

			<Group gap={0} justify="space-between" style={{ flex: 1 }} wrap="nowrap">
				{weekDays.map((dayData) => (
					<DayMiniGraph key={dayData.date} {...dayData} />
				))}
			</Group>

			<ActionIcon
				variant="subtle"
				c="dark.4"
				aria-label="Следующая неделя"
				onClick={() => handleWeekChange(1)}
				size="md"
				mx={-5}
			>
				<IconChevronRight size={18} />
			</ActionIcon>
		</Group>
	);
}
