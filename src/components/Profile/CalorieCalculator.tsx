import { useEffect, useState } from "react";
import {
	Button,
	Divider,
	Group,
	NumberInput,
	Paper,
	SegmentedControl,
	Select,
	Stack,
	Text,
	Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { useUpdateUserParamsMutation } from "../../api/userQueries";
import {
	calculateGoals,
	type ActivityLevel,
	type Gender,
	type Goal,
} from "../../utils/calorieCalculator";
import type {
	CalculatedResults,
	CalculatorParams,
	CalorieCalculatorProps,
} from "./CalorieCalculator.types";

export function CalorieCalculator({
	userId,
	isLoading = false,
	onSave,
	isSaving = false,
	initialParams,
}: CalorieCalculatorProps) {
	const [calculatedResults, setCalculatedResults] = useState<CalculatedResults | null>(null);
	const { mutate: updateParams } = useUpdateUserParamsMutation();

	const form = useForm<CalculatorParams>({
		mode: "controlled",
		initialValues: {
			weight: initialParams?.weight ?? null,
			height: initialParams?.height ?? null,
			age: initialParams?.age ?? null,
			gender: initialParams?.gender ?? null,
			activityLevel: initialParams?.activityLevel ?? null,
			goal: initialParams?.goal ?? null,
		},
		validate: {
			weight: (value: number | null) => (value && value > 0 ? null : "Вес должен быть больше 0"),
			height: (value: number | null) => (value && value > 0 ? null : "Рост должен быть больше 0"),
			age: (value: number | null) => (value && value > 0 ? null : "Возраст должен быть больше 0"),
		},
	});

	// Обновляем форму при изменении initialParams (только при первой загрузке)
	// biome-ignore lint/correctness/useExhaustiveDependencies: form is controlled
	useEffect(() => {
		if (initialParams && !form.values.weight && !form.values.height && !form.values.age) {
			form.setValues({
				weight: initialParams.weight ?? null,
				height: initialParams.height ?? null,
				age: initialParams.age ?? null,
				gender: initialParams.gender ?? null,
				activityLevel: initialParams.activityLevel ?? null,
				goal: initialParams.goal ?? null,
			});
		}
	}, [initialParams]);

	// Сохраняем параметры в Supabase при изменении (с debounce)
	useEffect(() => {
		// Не сохраняем, если это начальные значения
		const isInitialState =
			(!form.values.weight && !form.values.height && !form.values.age) ||
			(form.values.weight === initialParams?.weight &&
				form.values.height === initialParams?.height &&
				form.values.age === initialParams?.age);

		if (isInitialState) {
			return;
		}

		const timeoutId = setTimeout(() => {
			updateParams({
				...form.values,
				id: userId,
			});
		}, 1000); // Debounce 1 секунда

		return () => clearTimeout(timeoutId);
	}, [form.values, userId, initialParams, updateParams]);

	const handleCalculate = () => {
		const { weight, height, age, gender, activityLevel, goal } = form.values;

		if (!weight || !height || !age) {
			notifications.show({
				title: "Ошибка",
				message: "Заполните все поля для расчёта",
				color: "red",
			});
			return;
		}

		const results = calculateGoals({
			weight,
			height,
			age,
			gender,
			activityLevel,
			goal,
		});

		setCalculatedResults({
			caloriesGoal: results.caloriesGoal,
			proteinGoal: results.proteinGoal,
			bmr: results.bmr,
			tdee: results.tdee,
		});
	};

	const handleSave = () => {
		if (!calculatedResults) {
			return;
		}

		onSave(calculatedResults.caloriesGoal, calculatedResults.proteinGoal);
	};

	return (
		<Paper p="xl" radius="md" withBorder>
			<form onSubmit={form.onSubmit(handleCalculate)}>
				<Stack gap="md">
					<Title order={4}>Калькулятор целей</Title>

					<NumberInput
						label="Вес (кг)"
						placeholder="70"
						min={1}
						max={300}
						disabled={isLoading}
						{...form.getInputProps("weight")}
						styles={{
							label: { marginBottom: "0.5rem" },
						}}
					/>

					<NumberInput
						label="Рост (см)"
						placeholder="175"
						min={50}
						max={250}
						disabled={isLoading}
						{...form.getInputProps("height")}
						styles={{
							label: { marginBottom: "0.5rem" },
						}}
					/>

					<NumberInput
						label="Возраст (лет)"
						placeholder="30"
						min={1}
						max={120}
						disabled={isLoading}
						{...form.getInputProps("age")}
						styles={{
							label: { marginBottom: "0.5rem" },
						}}
					/>

					<div>
						<Text size="sm" fw={500} mb="xs">
							Пол
						</Text>
						<SegmentedControl
							fullWidth
							data={[
								{ label: "Мужской", value: "male" },
								{ label: "Женский", value: "female" },
							]}
							value={form.values.gender ?? "male"}
							onChange={(value) => form.setFieldValue("gender", value as Gender)}
							disabled={isLoading}
						/>
					</div>

					<Select
						label="Уровень активности"
						placeholder="Выберите уровень активности"
						data={[
							{
								value: "sedentary",
								label: "Сидячий образ жизни (офисная работа, минимум движения)",
							},
							{
								value: "light",
								label: "Легкая активность (1-3 тренировки в неделю, прогулки)",
							},
							{
								value: "moderate",
								label: "Умеренная активность (3-5 тренировок в неделю, регулярный спорт)",
							},
							{
								value: "high",
								label: "Высокая активность (6-7 тренировок в неделю, силовые тренировки)",
							},
							{
								value: "veryHigh",
								label: "Очень высокая активность (2 тренировки в день, профессиональный спорт)",
							},
						]}
						disabled={isLoading}
						{...form.getInputProps("activityLevel")}
						styles={{
							label: { marginBottom: "0.5rem" },
						}}
					/>

					<Select
						label="Цель"
						placeholder="Выберите цель"
						data={[
							{ value: "loss", label: "Похудение" },
							{ value: "maintain", label: "Поддержание веса" },
							{ value: "gain", label: "Набор массы" },
						]}
						disabled={isLoading}
						{...form.getInputProps("goal")}
						styles={{
							label: { marginBottom: "0.5rem" },
						}}
					/>

					<Group justify="flex-end" mt="md">
						<Button type="submit" disabled={isLoading}>
							Рассчитать
						</Button>
					</Group>
				</Stack>
			</form>

			{calculatedResults && (
				<>
					<Divider my="xl" />
					<Stack gap="md">
						<Title order={4}>Результаты расчёта</Title>

						<Paper p="md" radius="md" withBorder>
							<Stack gap="xs">
								<Group justify="space-between">
									<Text size="sm" c="dimmed">
										Базовый метаболизм (BMR):
									</Text>
									<Text fw={500}>{calculatedResults.bmr} ккал</Text>
								</Group>
								<Group justify="space-between">
									<Text size="sm" c="dimmed">
										Общий расход энергии (TDEE):
									</Text>
									<Text fw={500}>{calculatedResults.tdee} ккал</Text>
								</Group>
							</Stack>
						</Paper>

						<NumberInput
							label="Цель по калориям"
							value={calculatedResults.caloriesGoal}
							onChange={(value) =>
								setCalculatedResults((prev) =>
									prev
										? {
												...prev,
												caloriesGoal: typeof value === "number" ? value : Number(value) || 0,
											}
										: null,
								)
							}
							min={1}
							styles={{
								label: { color: "#ff7428", marginBottom: "0.5rem" },
							}}
						/>

						<NumberInput
							label="Цель по белку (г)"
							value={calculatedResults.proteinGoal}
							onChange={(value) =>
								setCalculatedResults((prev) =>
									prev
										? {
												...prev,
												proteinGoal: typeof value === "number" ? value : Number(value) || 0,
											}
										: null,
								)
							}
							min={1}
							styles={{
								label: { color: "#3d7cff", marginBottom: "0.5rem" },
							}}
						/>

						<Group justify="flex-end" mt="md">
							<Button onClick={handleSave} loading={isSaving} disabled={isLoading}>
								Сохранить цели
							</Button>
						</Group>
					</Stack>
				</>
			)}
		</Paper>
	);
}
