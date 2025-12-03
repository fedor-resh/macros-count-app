import { ActionIcon, Button, NumberInput, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconTrash, IconX } from "@tabler/icons-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
	useAddFoodMutation,
	useDeleteFoodMutation,
	useUpdateFoodMutation,
} from "../../api/foodQueries";
import { useAuthStore } from "../../stores/authStore";
import { useDateStore } from "../../stores/dateStore";
import { useProductDrawerStore } from "../../stores/productDrawerStore";
import { getFormattedDate } from "../../utils/dateUtils";
import { AboveKeyboardWrapper } from "./AboveKeyboardWrapper";

interface ProductDrawerValues {
	name: string;
	value: number | "";
	kcalories: number | "";
	protein: number | "";
}

export function ProductDrawer() {
	const { opened, mode, product, close } = useProductDrawerStore();
	const user = useAuthStore((state) => state.user);
	const selectedDate = useDateStore((state) => state.selectedDate);
	const navigate = useNavigate();

	const { mutate: addFood, isPending: isAdding } = useAddFoodMutation();
	const { mutate: updateFood, isPending: isUpdating } = useUpdateFoodMutation();
	const { mutate: deleteFood, isPending: isDeleting } = useDeleteFoodMutation();

	const isLoading = isAdding || isUpdating || isDeleting;

	const form = useForm<ProductDrawerValues>({
		mode: "controlled",
		initialValues: {
			name: "",
			value: "",
			kcalories: "",
			protein: "",
		},
		validate: {
			name: (value: string) => (value.trim().length === 0 ? "Название обязательно" : null),
			value: (value: number | "") => {
				if (value === "") return "Вес обязателен";
				const numValue = Number(value);
				if (numValue <= 0) return "Вес должен быть больше 0";
				return null;
			},
			kcalories: (value: number | "") => {
				if (value === "") return null;
				const numValue = Number(value);
				if (numValue < 0) return "Калории не могут быть отрицательными";
				return null;
			},
			protein: (value: number | "") => {
				if (value === "") return null;
				const numValue = Number(value);
				if (numValue < 0) return "Белки не могут быть отрицательными";
				return null;
			},
		},
	});

	// biome-ignore lint/correctness/useExhaustiveDependencies: form is controlled
	useEffect(() => {
		if (!opened) {
			return;
		}

		if (product) {
			form.setValues({
				name: product.name,
				value: product.value ?? "",
				kcalories: product.kcalories ?? "",
				protein: product.protein ?? "",
			});
		} else {
			form.reset();
		}
	}, [opened, product]);

	const handleSubmit = (values: typeof form.values) => {
		if (!user?.id || values.value === "" || values.kcalories === "" || values.protein === "") {
			return;
		}

		const foodData = {
			name: values.name,
			value: values.value,
			kcalories: values.kcalories,
			protein: values.protein,
			unit: product?.unit ?? "г",
			date:
				mode === "edit"
					? (product?.date ?? selectedDate ?? getFormattedDate())
					: (selectedDate ?? getFormattedDate()),
			userId: user.id,
		};

		if (mode === "edit" && product?.id) {
			updateFood(
				{ ...foodData, id: product.id },
				{
					onSuccess: () => {
						form.reset();
						close();
					},
				},
			);
		} else {
			addFood(foodData, {
				onSuccess: () => {
					form.reset();
					close();
					navigate("/");
				},
			});
		}
	};

	const handleDelete = () => {
		if (mode === "edit" && product?.id) {
			deleteFood(product.id, {
				onSuccess: () => {
					form.reset();
					close();
				},
			});
		}
	};

	const handleClose = () => {
		form.reset();
		close();
	};

	if (!opened) {
		return null;
	}

	return (
		<AboveKeyboardWrapper bottomOffset={16} autoFocus focusSelector='input[name="value"]'>
			<div
				style={{
					width: "100%",
					backgroundColor: "#1a1a1a",
					border: "1px solid #2a2a2a",
					borderRadius: 16,
					padding: "12px 16px",
					boxShadow: "0 6px 24px rgba(0, 0, 0, 0.45)",
				}}
			>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						marginBottom: 8,
						gap: 8,
					}}
				>
					<TextInput
						placeholder="Название продукта"
						{...form.getInputProps("name")}
						style={{ flex: 1, minWidth: 0 }}
					/>
					{mode === "edit" && (
						<ActionIcon
							variant="subtle"
							color="red"
							aria-label="Удалить"
							onClick={handleDelete}
							loading={isDeleting}
						>
							<IconTrash size={18} />
						</ActionIcon>
					)}
					<ActionIcon
						variant="subtle"
						color="gray"
						aria-label="Закрыть"
						onClick={handleClose}
						style={{ color: "#9a9a9a" }}
					>
						<IconX size={18} />
					</ActionIcon>
				</div>

				<form onSubmit={form.onSubmit(handleSubmit)}>
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "repeat(3, minmax(0, 1fr)) auto",
							gap: 8,
						}}
					>
						<NumberInput
							name="value"
							placeholder="Граммы"
							min={1}
							step={1}
							suffix="г"
							hideControls
							{...form.getInputProps("value")}
							styles={{
								input: {
									backgroundColor: "#2a2a2a",
									border: "1px solid #3a3a3a",
									color: "#d9d9d9",
									paddingInline: 12,
								},
							}}
							onFocusCapture={(event) => {
								event.currentTarget.select();
							}}
						/>

						<NumberInput
							name="kcalories"
							placeholder="ккал/100г"
							min={0}
							step={1}
							suffix="ккал"
							hideControls
							{...form.getInputProps("kcalories")}
							styles={{
								input: {
									backgroundColor: "#2a2a2a",
									border: "1px solid #3a3a3a",
									color: "#ff7428",
									paddingInline: 12,
								},
							}}
							onFocusCapture={(event) => {
								event.currentTarget.select();
							}}
						/>

						<NumberInput
							name="protein"
							placeholder="белок/100г"
							min={0}
							step={1}
							suffix="г"
							hideControls
							{...form.getInputProps("protein")}
							styles={{
								input: {
									backgroundColor: "#2a2a2a",
									border: "1px solid #3a3a3a",
									color: "#3d7cff",
									paddingInline: 12,
								},
							}}
							onFocusCapture={(event) => {
								event.currentTarget.select();
							}}
						/>

						<Button type="submit" loading={isLoading} style={{ backgroundColor: "#ff7428" }}>
							Сохранить
						</Button>
					</div>
				</form>
			</div>
		</AboveKeyboardWrapper>
	);
}
