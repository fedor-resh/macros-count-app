import { ActionIcon, Badge, Group, Loader, Paper, Stack, Text, TextInput } from "@mantine/core";
import { IconArrowLeft, IconSearch } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGetFoodsHistoryQuery, useSearchProductsQuery } from "../api/foodQueries";
import { AddProductDrawer } from "../components/MacrosTracker/AddProductDrawer";
import { FoodList } from "../components/FoodList";
import { useDateStore } from "../stores/dateStore";
import { EatenProduct } from "@/types/types";
import type { FoodItem } from "@/components/FoodList/types";

export function AddProductSearchPage() {
	const [query, setQuery] = useState("");
	const {
		data: foodsHistory = [],
		isLoading: isLoadingHistory,
		isError: isErrorHistory,
	} = useGetFoodsHistoryQuery(query, query.trim() ? 2 : 10);
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

	const drawerInitialProduct = useMemo(() => {
		if (!selectedProduct) {
			return undefined;
		}

		return {
			name: selectedProduct.name,
			value: selectedProduct.value,
			kcalories: selectedProduct.kcalories,
			protein: selectedProduct.protein,
		};
	}, [selectedProduct]);

	const isLoading = isLoadingHistory || (query.trim() && isLoadingProducts);
	const isError = isErrorHistory;

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
				{isLoading ? (
					<Paper withBorder p="xl" style={{ backgroundColor: "#1a1a1a", borderColor: "#2a2a2a" }}>
						<Group gap="sm" align="center">
							<Loader size="sm" color="orange" />
							<Text c="#9a9a9a">Загружаем продукты…</Text>
						</Group>
					</Paper>
				) : null}

				{!isLoading && isError ? (
					<Paper withBorder p="xl" style={{ backgroundColor: "#1a1a1a", borderColor: "#2a2a2a" }}>
						<Stack gap="xs" align="center">
							<Text c="#e66a6a">Не удалось загрузить продукты</Text>
							<Text size="sm" c="#9a9a9a">
								Попробуйте обновить страницу позже.
							</Text>
						</Stack>
					</Paper>
				) : null}

				{!isLoading && !isError ? (
					<FoodList
						items={searchResults}
						onItemClick={(index) => handleSelectProduct(searchResults[index])}
					/>
				) : null}
			</Stack>

			<AddProductDrawer
				selectedDate={selectedDate ?? undefined}
				opened={drawerOpened}
				onClose={handleDrawerClose}
				initialProduct={drawerInitialProduct}
			/>
		</Stack>
	);
}
