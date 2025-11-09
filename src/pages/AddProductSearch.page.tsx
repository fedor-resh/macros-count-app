import { Badge, Group, Loader, Paper, Stack, Text, TextInput } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { useGetFoodsHistoryQuery } from "../api/foodQueries";
import { AddProductDrawer } from "../components/MacrosTracker/AddProductDrawer";
import { useDateStore } from "../stores/dateStore";
import type { EatenProduct } from "../types/types";

export function AddProductSearchPage() {
	const [query, setQuery] = useState("");
	const { data: foodsHistory = [], isLoading, isError } = useGetFoodsHistoryQuery();
	const [drawerOpened, setDrawerOpened] = useState(false);
	const [selectedProduct, setSelectedProduct] = useState<EatenProduct | null>(null);
	const selectedDate = useDateStore((state) => state.selectedDate);

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
			<TextInput
				autoFocus
				placeholder="Введите название продукта"
				leftSection={<IconSearch size={18} />}
				value={query}
				onChange={(event) => setQuery(event.currentTarget.value)}
				style={{
					viewTransitionName: "search-input",
				}}
			/>

			<Stack gap="sm">
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

				{!isLoading && !isError
					? filteredProducts.map((product) => (
							<Paper
								key={product.id}
								withBorder
								p="md"
								onClick={() => handleSelectProduct(product)}
								style={{
									backgroundColor: "#1a1a1a",
									borderColor: "#2a2a2a",
									cursor: "pointer",
								}}
							>
								<Stack gap={4}>
									<Group justify="space-between" align="flex-start">
										<Text fw={600} c="#d9d9d9">
											{product.name}
										</Text>
										<Group gap={8}>
											<Badge color="orange" variant="light">
												{product.kcalories ?? "—"} ккал
											</Badge>
											<Badge color="blue" variant="light">
												{product.protein ?? "—"} г белка
											</Badge>
										</Group>
									</Group>
									<Group gap={8}>
										{product.value ? (
											<Badge color="gray" variant="light">
												{product.value}
												{product.unit ? ` ${product.unit}` : ""}
											</Badge>
										) : null}
										{product.date ? (
											<Text size="xs" c="#6a6a6a">
												Дата: {product.date}
											</Text>
										) : null}
									</Group>
									<Text size="xs" c="#6a6a6a">
										Нажмите, чтобы повторно использовать этот продукт
									</Text>
								</Stack>
							</Paper>
					  ))
					: null}

				{!isLoading && !isError && filteredProducts.length === 0 ? (
					<Paper
						withBorder
						p="xl"
						style={{ backgroundColor: "#1a1a1a", borderColor: "#2a2a2a" }}
					>
						<Stack gap="xs" align="center">
							<Text c="#9a9a9a">Ничего не найдено</Text>
							<Text size="sm" c="#6a6a6a">
								Попробуйте изменить запрос или добавить продукт вручную.
							</Text>
						</Stack>
					</Paper>
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

