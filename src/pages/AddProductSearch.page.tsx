import { ActionIcon, Badge, Stack, TextInput } from "@mantine/core";
import { IconArrowLeft, IconSearch } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { FoodItem } from "@/components/FoodList/types";
import { useGetFoodsHistoryQuery, useSearchProductsQuery } from "../api/foodQueries";
import { FoodList } from "../components/FoodList";
import { ProductDrawer } from "../components/MacrosTracker/ProductDrawer";
import { useProductDrawerStore } from "../stores/productDrawerStore";

export function AddProductSearchPage() {
	const [query, setQuery] = useState("");
	const { data: foodsHistory = [], isLoading: isLoadingHistory } = useGetFoodsHistoryQuery(
		query,
		10,
	);

	function getUniqueBy<T>(array: T[], ...keys: (keyof T)[]): T[] {
		const createPair = (item: T): [string, T] => {
			const compositeKey = keys.map((key) => String(item[key])).join("|");
			return [compositeKey, item];
		};

		return [...new Map(array.map(createPair)).values()];
	}

	const foodsHistoryUnique = getUniqueBy(foodsHistory, "kcalories", "protein");

	const { data: productsData = [], isLoading: isLoadingProducts } = useSearchProductsQuery(
		query,
		20,
	);
	const openForAdd = useProductDrawerStore((state) => state.openForAdd);
	const navigate = useNavigate();

	useEffect(() => {
		window.scrollTo({ top: 0, behavior: "auto" });
	}, []);

	// Combine results from eaten_products and products
	const searchResults = useMemo((): FoodItem[] => {
		// Convert eaten products to SearchResult
		const eatenResults = foodsHistoryUnique.map((item) => ({
			...item,
			value: item.value ?? 100,
			badges: (
				<Badge variant="light" color="green.9">
					мой
				</Badge>
			),
		}));
		// Строки products имеют другую форму (snake_case, нет date/status).
		return [...eatenResults, ...productsData] as FoodItem[];
	}, [productsData, foodsHistoryUnique]);

	const handleSelectProduct = (product: FoodItem) => {
		openForAdd(product);
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

			<ProductDrawer />
		</Stack>
	);
}
