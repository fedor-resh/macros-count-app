import { ActionIcon, Group, Loader, Paper, Stack, Text, TextInput } from "@mantine/core";
import { IconArrowLeft, IconSearch } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGetFoodsHistoryQuery } from "../api/foodQueries";
import { AddProductDrawer } from "../components/MacrosTracker/AddProductDrawer";
import { FoodList } from "../components/MacrosTracker/FoodList";
import { useDateStore } from "../stores/dateStore";
import type { EatenProduct } from "../types/types";

export function AddProductSearchPage() {
	const [query, setQuery] = useState("");
	const { data: foodsHistory = [], isLoading, isError } = useGetFoodsHistoryQuery();
	const [drawerOpened, setDrawerOpened] = useState(false);
	const [selectedProduct, setSelectedProduct] = useState<EatenProduct | null>(null);
	const selectedDate = useDateStore((state) => state.selectedDate);
	const navigate = useNavigate();

	useEffect(() => {
		window.scrollTo({ top: 0, behavior: "auto" });
	}, []);

	const uniqueProducts = useMemo(() => {
		const seen = new Set<string>();
		const unique: EatenProduct[] = [];

		for (const product of foodsHistory) {
			const key = product.name.trim().toLowerCase();
			if (seen.has(key)) {
				continue;
			}
			seen.add(key);
			unique.push(product);
		}

		return unique;
	}, [foodsHistory]);

	const filteredProducts = useMemo(() => {
		const normalized = query.trim().toLowerCase();
		if (!normalized) {
			return uniqueProducts;
		}

		return uniqueProducts.filter((product) => product.name.toLowerCase().includes(normalized));
	}, [query, uniqueProducts]);

	const handleSelectProduct = (product: EatenProduct) => {
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
			value: selectedProduct.value ?? 100,
			kcalories: selectedProduct.kcalories,
			protein: selectedProduct.protein,
			unit: selectedProduct.unit,
		};
	}, [selectedProduct]);

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
					onClick={() => navigate("/", { viewTransition: true })}
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
					<Paper
						withBorder
						p="xl"
						style={{ backgroundColor: "#1a1a1a", borderColor: "#2a2a2a" }}
					>
						<Group gap="sm" align="center">
							<Loader size="sm" color="orange" />
							<Text c="#9a9a9a">Загружаем историю продуктов…</Text>
						</Group>
					</Paper>
				) : null}

				{!isLoading && isError ? (
					<Paper
						withBorder
						p="xl"
						style={{ backgroundColor: "#1a1a1a", borderColor: "#2a2a2a" }}
					>
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
						items={filteredProducts}
						onItemClick={(index) => handleSelectProduct(filteredProducts[index])}
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

