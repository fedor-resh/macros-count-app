import { Container, Space, Stack } from "@mantine/core";
import { startTransition, useEffect, useMemo, useState } from "react";
import { useGetTodayFoodsQuery } from "../api/foodQueries";
import { useGetUserGoalsQuery } from "../api/userQueries";
import { AddProductDrawer } from "../components/MacrosTracker/AddProductDrawer";
import { AddProductFAB } from "../components/MacrosTracker/AddProductFAB";
import { CircularGraph } from "../components/MacrosTracker/CircularGraph";
import { FoodList } from "../components/MacrosTracker/FoodList";
import { ProductDrawer } from "../components/MacrosTracker/ProductDrawer";
import { WeeklyProgress } from "../components/MacrosTracker/WeeklyProgress";
import { useAuthStore } from "../stores/authStore";
import { useDateStore } from "../stores/dateStore";
import type { EatenProduct } from "../types/types";

export function HomePage() {
	const user = useAuthStore((state) => state.user);
	const selectedDate = useDateStore((state) => state.selectedDate);
	const [addProductDrawerOpened, setAddProductDrawerOpened] = useState(false);
	const { data: eatenProducts = [] } = useGetTodayFoodsQuery(
		user?.id ?? "",
		selectedDate || new Date().toLocaleDateString("sv-SE"),
	);
	const [eatenProductsCopy, setEatenProductsCopy] = useState<EatenProduct[]>([]);
	useEffect(() => {
		if (eatenProducts.length > 0) {
			startTransition(() => {
				setEatenProductsCopy(() => [...eatenProducts]);
			});
		}
	}, [eatenProducts]);
	const { data: userGoals } = useGetUserGoalsQuery(user?.id || "");

	const [selectedProductIndex, setSelectedProductIndex] = useState<number | null>(null);
	const [editDrawerOpened, setEditDrawerOpened] = useState(false);

	const { totalCalories, totalProtein } = useMemo(() => {
		const calories =
			eatenProducts.reduce((sum, item) => sum + ((item.kcalories! * item.value!) / 100 || 0), 0) ||
			0;
		const protein =
			eatenProducts.reduce((sum, item) => sum + ((item.protein! * item.value!) / 100 || 0), 0) || 0;

		return {
			totalCalories: Math.round(calories),
			totalProtein: Math.round(protein),
		};
	}, [eatenProducts]);

	const handleItemClick = (index: number) => {
		setSelectedProductIndex(index);
		setEditDrawerOpened(true);
	};

	const handleEditDrawerClose = () => {
		setEditDrawerOpened(false);
		setSelectedProductIndex(null);
	};

	const selectedProduct =
		selectedProductIndex !== null ? eatenProducts[selectedProductIndex] : null;

	const caloriesGoal = userGoals?.calories_goal || 3000;
	const proteinGoal = userGoals?.protein_goal || 150;

	return (
		<Container size="sm" py="xl" px="0" my="0">
			<Stack gap="xl">
				<CircularGraph
					calories={totalCalories}
					protein={totalProtein}
					caloriesGoal={caloriesGoal}
					proteinGoal={proteinGoal}
				/>
				<WeeklyProgress
					userId={user?.id ?? ""}
					caloriesGoal={caloriesGoal}
					proteinGoal={proteinGoal}
				/>
				<FoodList items={eatenProductsCopy} onItemClick={handleItemClick} />
				<Space h="100px" />
			</Stack>

			<AddProductFAB onAddProduct={() => setAddProductDrawerOpened(true)} />

			<ProductDrawer
				opened={editDrawerOpened}
				onClose={handleEditDrawerClose}
				product={selectedProduct}
			/>

			<AddProductDrawer
				selectedDate={selectedDate || new Date().toISOString().split("T")[0]}
				opened={addProductDrawerOpened}
				onClose={() => setAddProductDrawerOpened(false)}
			/>
		</Container>
	);
}
