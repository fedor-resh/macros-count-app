import { useMemo, useState } from "react";
import { Container, Stack } from "@mantine/core";
import { useGetTodayFoodsQuery } from "../api/foodQueries";
import { useGetUserGoalsQuery } from "../api/userQueries";
import { AddProductDrawer } from "../components/MacrosTracker/AddProductDrawer";
import { AddProductFAB } from "../components/MacrosTracker/AddProductFAB";
import { CircularGraph } from "../components/MacrosTracker/CircularGraph";
import { FoodItem, FoodList } from "../components/MacrosTracker/FoodList";
import { ProductDrawer } from "../components/MacrosTracker/ProductDrawer";
import { WeeklyProgress } from "../components/MacrosTracker/WeeklyProgress";
import { useAddProductDrawerStore } from "../stores/addProductDrawerStore";
import { useAuthStore } from "../stores/authStore";
import { useDateStore } from "../stores/dateStore";

export function HomePage() {
	const user = useAuthStore((state) => state.user);
	const selectedDate = useDateStore((state) => state.selectedDate);
	const openAddProductDrawer = useAddProductDrawerStore((state) => state.open);
	const { data: eatenProducts = [] } = useGetTodayFoodsQuery(
		user?.id ?? "",
		selectedDate || new Date().toISOString().split("T")[0],
	);
	const { data: userGoals } = useGetUserGoalsQuery(user?.id || "");

	const [selectedProductIndex, setSelectedProductIndex] = useState<
		number | null
	>(null);
	const [editDrawerOpened, setEditDrawerOpened] = useState(false);

	const foodItems = useMemo(
		() =>
			eatenProducts.map((item) => ({
				id: item.id.toString(),
				name: item.name,
				weight: `${item.value}${item.unit}`,
				calories: `${item.kcalories}к`,
				protein: `${item.protein}г`,
				image_url: item.image_url,
			})),
		[eatenProducts],
	);

	const { totalCalories, totalProtein } = useMemo(() => {
		const calories =
			eatenProducts.reduce(
				(sum, item) => sum + ((item.kcalories! * item.value!) / 100 || 0),
				0,
			) || 0;
		const protein =
			eatenProducts.reduce(
				(sum, item) => sum + ((item.protein! * item.value!) / 100 || 0),
				0,
			) || 0;

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
				<FoodList items={foodItems} onItemClick={handleItemClick} />
			</Stack>

			<AddProductFAB onAddProduct={() => openAddProductDrawer()} />

			<ProductDrawer
				opened={editDrawerOpened}
				onClose={handleEditDrawerClose}
				product={selectedProduct}
			/>

			<AddProductDrawer
				selectedDate={selectedDate || new Date().toISOString().split("T")[0]}
			/>
		</Container>
	);
}
