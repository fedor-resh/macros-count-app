import { Button, Drawer, NumberInput, Stack, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useAddFoodMutation } from "../../api/foodQueries";
import { useAuthStore } from "../../stores/authStore";

interface AddProductDrawerProps {
	selectedDate?: string;
	opened: boolean;
	onClose: () => void;
}

interface AddProductDrawerValues {
	name: string;
	value: number | "";
	kcalories: number | "";
	protein: number | "";
}

export function AddProductDrawer({ selectedDate, opened, onClose }: AddProductDrawerProps) {
	const user = useAuthStore((state) => state.user);
	const { mutate: addFood, isPending: isLoading } = useAddFoodMutation();

	const form = useForm<AddProductDrawerValues>({
		mode: "controlled",
		initialValues: {
			name: "",
			value: "",
			kcalories: "",
			protein: "",
		},
		validate: {
			name: (value: string) =>
				value.trim().length === 0 ? "Название обязательно" : null,
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


	const handleSubmit = async (values: typeof form.values) => {
		if (
			!user?.id ||
			values.value === "" ||
			values.kcalories === "" ||
			values.protein === ""
		) {
			return;
		}

		addFood(
			{
				name: values.name,
				value: values.value,
				unit: "г",
				kcalories: values.kcalories,
				protein: values.protein,
				date: selectedDate || new Date().toISOString().split("T")[0],
				user_id: user.id,
			},
			{
				onSuccess: () => {
					form.reset();
					onClose();
				},
			},
		);
	};

	const handleClose = () => {
		form.reset();
		onClose();
	};

	return (
		<Drawer
			opened={opened}
			onClose={handleClose}
			title="Добавить продукт"
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
							label: { color: "#ff7428" },
						}}
					/>

					<NumberInput
						label="Белки (на 100г)"
						placeholder="0"
						min={0}
						step={1}
						suffix="г"
						{...form.getInputProps("protein")}
						styles={{
							label: { color: "#3d7cff" },
						}}
					/>

					<Button type="submit" loading={isLoading} fullWidth mt="md">
						Сохранить
					</Button>
				</Stack>
			</form>
		</Drawer>
	);
}
