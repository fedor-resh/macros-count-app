import { ActionIcon, Badge, Group, Loader, Paper, Stack, Text, TextInput } from "@mantine/core";
import { IconArrowLeft, IconSearch } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { FoodItem } from "@/components/FoodList/types";
import type { EatenProduct } from "@/types/types";
import { useGetFoodsHistoryQuery, useSearchProductsQuery } from "../api/foodQueries";
import { FoodList } from "../components/FoodList";
import { AddProductDrawer } from "../components/MacrosTracker/AddProductDrawer";
import { useDateStore } from "../stores/dateStore";

export function AddProductSearchPage() {
	const [query, setQuery] = useState("");
	const { data: foodsHistory = [], isLoading: isLoadingHistory } = useGetFoodsHistoryQuery(
		query,
		query.trim() ? 2 : 10,
	);
	const { data: productsData = [], isLoading: isLoadingProducts } = useSearchProductsQuery(
		query,
		20,
	);
	const [drawerOpened, setDrawerOpened] = useState(false);
	const [selectedProduct, setSelectedProduct] = useState<EatenProduct | null>(null);
	const selectedDate = useDateStore((state) => state.selectedDate);
	const navigate = useNavigate();

	useEffect(() => {
		window.scrollTo({ top: 0, behavior: "auto" });
	}, []);

	// Combine results from eaten_products and products
	const searchResults = useMemo((): FoodItem[] => {
		// Convert eaten products to SearchResult
		const eatenResults = foodsHistory.map((item) => ({
			...item,
			value: item.value ?? 100,
			badges: (
				<Badge variant="light" color="green.9">
					мой
				</Badge>
			),
		}));

		return [...eatenResults, ...productsData];
	}, [foodsHistory, productsData]);

	const handleSelectProduct = (product: FoodItem) => {
		setSelectedProduct(product);
		setDrawerOpened(true);
	};

	const handleDrawerClose = () => {
		setDrawerOpened(false);
		setSelectedProduct(null);
	};

	const isLoading = isLoadingHistory || (query.trim() && isLoadingProducts);

	return (
		<Stack gap="lg">
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: 12,
				}}
			>
				<ActionIcon
					variant="default"
					aria-label="Назад"
					size="xl"
					style={{
						height: 50,
						width: 60,
					}}
					onClick={() => navigate("/")}
				>
					<IconArrowLeft size={20} />
				</ActionIcon>

				<TextInput
					placeholder="Введите название продукта"
					leftSection={<IconSearch size={20} />}
					value={query}
					onChange={(event) => setQuery(event.currentTarget.value)}
					name="search-input"
					autoFocus
					size="lg"
					style={{
						viewTransitionName: "search-input",
						width: "100%",
					}}
				/>
			</div>

			<Stack gap="sm" style={{ flex: 1, overflowY: "auto", paddingBottom: 16 }}>
				<FoodList
					isLoading={!!isLoading}
					items={searchResults}
					onItemClick={(index) => handleSelectProduct(searchResults[index])}
				/>
			</Stack>

			<AddProductDrawer
				selectedDate={selectedDate ?? undefined}
				opened={drawerOpened}
				onClose={handleDrawerClose}
				initialProduct={selectedProduct!}
			/>
		</Stack>
	);
}
