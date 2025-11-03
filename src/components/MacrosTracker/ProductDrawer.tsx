
import {
	Button,
	Drawer,
	Group,
	NumberInput,
	Stack,
	TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useEffect } from "react";
import {
	useDeleteFoodMutation,
	useUpdateFoodMutation,
} from "../../api/foodQueries";
import type { EatenProduct } from "../../types/types";

interface ProductDrawerProps {
	opened: boolean;
	onClose: () => void;
	product: EatenProduct | null;
}

const initialValues = {
	name: "",
	value: 0,
	kcalories: 0,
	protein: 0,
};

export function ProductDrawer({
	opened,
	onClose,
	product,
}: ProductDrawerProps) {
	const { mutate: updateFood, isPending: isUpdating } = useUpdateFoodMutation();
	const { mutate: deleteFood, isPending: isDeleting } = useDeleteFoodMutation();
	console.log(product);
	const form = useForm({
		initialValues,
		validate: {
			name: (value: string) =>
				value.trim().length === 0 ? "Название обязательно" : null,
			value: (value: number) => {
				if (value <= 0) return "Вес должен быть больше 0";
				if (value % 1 !== 0) return "Вес должен быть целым числом";
				return null;
			},
			kcalories: (value: number) => {
				if (value < 0) return "Калории не могут быть отрицательными";
				if (value % 1 !== 0) return "Калории должны быть целым числом";
				return null;
			},
			protein: (value: number) => {
				if (value < 0) return "Белки не могут быть отрицательными";
				if (value % 1 !== 0) return "Белки должны быть целым числом";
				return null;
			},
		},
	});

	// biome-ignore lint/correctness/useExhaustiveDependencies: form from useForm is stable and doesn't need to be in deps
	useEffect(() => {
		if (product) {
			form.setValues({
				name: product.name,
				value: product.value ?? 0,
				kcalories: product.kcalories ?? 0,
				protein: product.protein ?? 0,
			});
		}
	}, [product]);
	
	const handleSubmit = async (values: typeof form.values) => {
		if (!product?.id) {
			return;
		}

		updateFood(
			{
				id: product.id,
				...values,
			},
			{
				onSuccess: () => {
					onClose();
				},
			},
		);
	};

	const handleDelete = async () => {
		if (!product?.id) {
			return;
		}

		deleteFood(product.id, {
			onSuccess: () => {
				onClose();
			},
		});
	};

	return (
		<Drawer
			opened={opened}
			onClose={onClose}
			title="Редактировать продукт"
			position="bottom"
			size="500px"
			styles={{
				title: { color: "#d9d9d9", fontSize: "1.25rem", fontWeight: 600 },
				header: {
					backgroundColor: "#1a1a1a",
					borderBottom: "1px solid #2a2a2a",
				},
				body: { backgroundColor: "#1a1a1a", padding: "1.5rem" },
				content: { backgroundColor: "#1a1a1a" },
			}}
		>
			<form onSubmit={form.onSubmit(handleSubmit)}>
				<Stack gap="md">
					<TextInput
						label="Название продукта"
						placeholder="Введите название"
						{...form.getInputProps("name")}
						styles={{
							label: { color: "#d9d9d9", marginBottom: "0.5rem" },
							input: {
								backgroundColor: "#2a2a2a",
								border: "1px solid #3a3a3a",
								color: "#d9d9d9",
								"&:focus": { borderColor: "#ff7428" },
							},
						}}
					/>

					<NumberInput
						label="Граммы"
						placeholder="100"
						min={0}
						step={1}
						suffix="г"
						{...form.getInputProps("value")}
						styles={{
							label: { color: "#d9d9d9", marginBottom: "0.5rem" },
							input: {
								backgroundColor: "#2a2a2a",
								border: "1px solid #3a3a3a",
								color: "#d9d9d9",
								"&:focus": { borderColor: "#ff7428" },
							},
						}}
					/>

					<NumberInput
						label="Калории (на 100г)"
						placeholder="0"
						min={0}
						step={1}
						suffix="ккал"
						{...form.getInputProps("kcalories")}
						styles={{
							label: { color: "#ff7428", marginBottom: "0.5rem" },
							input: {
								backgroundColor: "#2a2a2a",
								border: "1px solid #3a3a3a",
								color: "#d9d9d9",
								"&:focus": { borderColor: "#ff7428" },
							},
						}}
					/>

					<NumberInput
						label="Белки (на 100г)"
						placeholder="0"
						min={0}
						step={0.1}
						suffix="г"
						{...form.getInputProps("protein")}
						styles={{
							label: { color: "#3d7cff", marginBottom: "0.5rem" },
							input: {
								backgroundColor: "#2a2a2a",
								border: "1px solid #3a3a3a",
								color: "#d9d9d9",
								"&:focus": { borderColor: "#3d7cff" },
							},
						}}
					/>

					<Group grow mt="md">
						<Button
							type="submit"
							loading={isUpdating}
							disabled={isDeleting}
							styles={{
								root: {
									backgroundColor: "#ff7428",
									color: "#1a1a1a",
									"&:hover": { backgroundColor: "#ff8542" },
								},
							}}
						>
							Сохранить
						</Button>

						<Button
							type="button"
							onClick={handleDelete}
							loading={isDeleting}
							disabled={isUpdating}
							styles={{
								root: {
									backgroundColor: "#dc3545",
									color: "#ffffff",
									"&:hover": { backgroundColor: "#c82333" },
								},
							}}
						>
							Удалить
						</Button>
					</Group>
				</Stack>
			</form>
		</Drawer>
	);
}
