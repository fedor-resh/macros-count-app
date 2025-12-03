import { Container, Space, Stack } from "@mantine/core";
import { useMemo } from "react";
import { useGetWeeklyFoodsQuery } from "../api/foodQueries";
import { useGetUserGoalsQuery } from "../api/userQueries";
import { FoodList } from "../components/FoodList";
import { AddProductFAB } from "../components/MacrosTracker/AddProductFAB";
import { CalorieGoalReminder } from "../components/MacrosTracker/CalorieGoalReminder";
import { CircularGraph } from "../components/MacrosTracker/CircularGraph";
import { ProductDrawer } from "../components/MacrosTracker/ProductDrawer";
import { WeeklyProgress } from "../components/MacrosTracker/WeeklyProgress";
import { useDateStore } from "../stores/dateStore";
import { useProductDrawerStore } from "../stores/productDrawerStore";
import { getFormattedDate } from "../utils/dateUtils";

export function HomePage() {
	const selectedDate = useDateStore((state) => state.selectedDate);
	const { data: weeklyFoods = [] } = useGetWeeklyFoodsQuery(selectedDate);
	const { data: userGoals, isLoading: isUserGoalsLoading } = useGetUserGoalsQuery();
	const openForEdit = useProductDrawerStore((state) => state.openForEdit);

	const eatenProducts = useMemo(() => {
		const targetDate = selectedDate || getFormattedDate();
		return weeklyFoods.filter((food) => food.date === targetDate);
	}, [weeklyFoods, selectedDate]);

	const { totalCalories, totalProtein } = useMemo(() => {
		const calories = eatenProducts.reduce((sum, item) => {
			const kcalories = item.kcalories ?? 0;
			const value = item.value ?? 0;
			return sum + (kcalories * value) / 100;
		}, 0);
		const protein = eatenProducts.reduce((sum, item) => {
			const proteinPer100 = item.protein ?? 0;
			const value = item.value ?? 0;
			return sum + (proteinPer100 * value) / 100;
		}, 0);

		return {
			totalCalories: Math.round(calories),
			totalProtein: Math.round(protein),
		};
	}, [eatenProducts]);

	const handleItemClick = (index: number) => {
		const product = eatenProducts[index];
		if (product) {
			openForEdit(product);
		}
	};

	const caloriesGoal = userGoals?.caloriesGoal ?? 3000;
	const proteinGoal = userGoals?.proteinGoal ?? 150;

	// Check if user has filled in their parameters
	const hasFilledParameters = !!userGoals?.weight && !!userGoals?.height && !!userGoals?.age;

	return (
		<Container size="sm" py="xl" px="0" my="0">
			<Stack gap="xl">
				<CircularGraph
					calories={totalCalories}
					protein={totalProtein}
					caloriesGoal={caloriesGoal}
					proteinGoal={proteinGoal}
				/>
				<WeeklyProgress caloriesGoal={caloriesGoal} proteinGoal={proteinGoal} />

				{userGoals && !hasFilledParameters && !isUserGoalsLoading && <CalorieGoalReminder />}
				<FoodList items={eatenProducts} onItemClick={handleItemClick} />
				<Space h="100px" />
			</Stack>

			<AddProductFAB />
			<ProductDrawer />
		</Container>
	);
}
