import { ActionIcon, Button, NumberInput, Text } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useEffect } from "react";
import { IconX } from "@tabler/icons-react";
import { useAddFoodMutation } from "../../api/foodQueries";
import { AboveKeyboardWrapper } from "./AboveKeyboardWrapper";
import { useAuthStore } from "../../stores/authStore";
import { getFormattedDate } from "../../utils/dateUtils";
import { useNavigate } from "react-router-dom";

interface AddProductDrawerProps {
	selectedDate?: string;
	opened: boolean;
	onClose: () => void;
	initialProduct?: {
		name: string;
		value?: number | null;
		kcalories?: number | null;
		protein?: number | null;
		unit?: string | null;
	};
}

interface AddProductDrawerValues {
	name: string;
	value: number | "";
	kcalories: number | "";
	protein: number | "";
}

export function AddProductDrawer({
	selectedDate,
	opened,
	onClose,
	initialProduct,
}: AddProductDrawerProps) {
	const user = useAuthStore((state) => state.user);
	const { mutate: addFood, isPending: isLoading } = useAddFoodMutation();
	const navigate = useNavigate();

	const form = useForm<AddProductDrawerValues>({
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
				if (numValue % 1 !== 0) return "Вес должен быть целым числом";
				return null;
			},
			kcalories: (value: number | "") => {
				if (value === "") return null; // Allow empty, validation happens on submit
				const numValue = Number(value);
				if (numValue < 0) return "Калории не могут быть отрицательными";
				if (numValue % 1 !== 0) return "Калории должны быть целым числом";
				return null;
			},
			protein: (value: number | "") => {
				if (value === "") return null; // Allow empty, validation happens on submit
				const numValue = Number(value);
				if (numValue < 0) return "Белки не могут быть отрицательными";
				if (numValue % 1 !== 0) return "Белки должны быть целым числом";
				return null;
			},
		},
	});

	// biome-ignore lint/correctness/useExhaustiveDependencies: form is controlled
	useEffect(() => {
		if (!opened) {
			return;
		}

		if (initialProduct) {
			form.setValues(initialProduct as AddProductDrawerValues);
		} else {
			form.reset();
		}
	}, [opened, initialProduct]);

	const handleSubmit = async (values: typeof form.values) => {
		if (!user?.id || values.value === "" || values.kcalories === "" || values.protein === "") {
			return;
		}

		addFood(
			{
				name: values.name,
				value: values.value,
				unit: initialProduct?.unit ?? "г",
				kcalories: values.kcalories,
				protein: values.protein,
				date: selectedDate || getFormattedDate(),
				userId: user.id,
			},
			{
				onSuccess: () => {
					form.reset();
					onClose();
				},
			},
		);
		navigate("/");
	};

	const handleClose = () => {
		form.reset();
		onClose();
	};

	if (!opened) {
		return null;
	}

	const productTitle = initialProduct?.name ?? form.values.name ?? "Добавить продукт";

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
						gap: 12,
					}}
				>
					<Text c="#d9d9d9" fw={600} size="sm" style={{ flex: 1, minWidth: 0 }}>
						{productTitle}
					</Text>
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
					<input type="hidden" value={form.values.name} name="name" />
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
