import {
	Avatar,
	Button,
	Card,
	Center,
	Container,
	Divider,
	Group,
	Modal,
	NumberInput,
	Paper,
	Space,
	Stack,
	Text,
	Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconLogout } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGetUserGoalsQuery, useUpdateUserGoalsMutation } from "../api/userQueries";
import { CalorieCalculator } from "../components/Profile/CalorieCalculator";
import { useAuthStore } from "../stores/authStore";
import "dayjs/locale/ru";
import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import isoWeek from "dayjs/plugin/isoWeek";
import { useGetFoodsInRangeQuery } from "@/api/foodQueries";
import { useDateRangeContext } from "@/hooks/useDateRangeContext";
import CalendarForAverageDailyCalories from "../components/Profile/CalendarForAverageDailyCalories";
import { useMeanCalories } from "@/hooks/useMeanCalories";

dayjs.extend(isBetween);
dayjs.extend(isoWeek);
dayjs.locale("ru");

export function ProfilePage() {
	const navigate = useNavigate();
	const user = useAuthStore((state) => state.user);
	const signOut = useAuthStore((state) => state.signOut);
	const { data: userGoals, isLoading: isLoadingGoals } = useGetUserGoalsQuery();
	const { mutate: updateGoals, isPending } = useUpdateUserGoalsMutation();

	const displayName = user?.email || "User";
	const email = user?.email || "";
	const avatarUrl: string | undefined = undefined;

	const handleLogout = async () => {
		await signOut();
		navigate("/login");
	};

	const handleSave = (caloriesGoal: number, proteinGoal: number) => {
		if (!user?.id) {
			return;
		}

		updateGoals(
			{
				userId: user.id,
				caloriesGoal,
				proteinGoal,
			},
			{
				onSuccess: () => {
					notifications.show({
						title: "Успешно",
						message: "Цели успешно обновлены",
						color: "green",
					});
				},
				onError: () => {
					notifications.show({
						title: "Ошибка",
						message: "Не удалось обновить цели",
						color: "red",
					});
				},
			},
		);
	};

	const { datesFromTo } = useDateRangeContext();

	const [from, to] = datesFromTo;
	const { data: intervalFoods = [] } = useGetFoodsInRangeQuery(from, to);

	const meanCaloriesInterval = useMeanCalories(from, to, intervalFoods);



	const [caloriesModalOpened, { open: openCaloriesModal, close: closeCaloriesModal }] =
		useDisclosure(false);
	const [proteinModalOpened, { open: openProteinModal, close: closeProteinModal }] =
		useDisclosure(false);

	const [caloriesGoal, setCaloriesGoal] = useState<number | string>("");
	const [proteinGoal, setProteinGoal] = useState<number | string>("");

	useEffect(() => {
		if (caloriesModalOpened && userGoals) {
			setCaloriesGoal(userGoals.caloriesGoal ?? "");
		}
	}, [caloriesModalOpened, userGoals]);

	useEffect(() => {
		if (proteinModalOpened && userGoals) {
			setProteinGoal(userGoals.proteinGoal ?? "");
		}
	}, [proteinModalOpened, userGoals]);

	const handleSaveCaloriesGoal = () => {
		if (!user?.id || !userGoals) {
			return;
		}

		const calories = typeof caloriesGoal === "string" ? Number(caloriesGoal) : caloriesGoal;

		if (!calories || calories < 1) {
			notifications.show({
				title: "Ошибка",
				message: "Пожалуйста, введите корректное значение калорий",
				color: "red",
			});
			return;
		}

		handleSave(calories, userGoals.proteinGoal);
		closeCaloriesModal();
	};

	const handleSaveProteinGoal = () => {
		if (!user?.id || !userGoals) {
			return;
		}

		const protein = typeof proteinGoal === "string" ? Number(proteinGoal) : proteinGoal;

		if (!protein || protein < 1) {
			notifications.show({
				title: "Ошибка",
				message: "Пожалуйста, введите корректное значение белка",
				color: "red",
			});
			return;
		}

		handleSave(userGoals.caloriesGoal, protein);
		closeProteinModal();
	};


	return (
		<Container size="sm" py="xl" px="0" my="0">
			<Stack gap="xl">
				<Title order={1}>Профиль</Title>

				<Paper p="xl" radius="md" withBorder>
					<Group gap="md">
						<Avatar src={avatarUrl} alt={displayName} name={displayName} radius="xl" size={50} />
						<Stack gap={0}>
							<Title order={4}>{displayName}</Title>
							{email && <Text c="dimmed">{email}</Text>}
						</Stack>
					</Group>
				</Paper>

				<Paper pt="xl" px="xl" pb="md" radius="md" withBorder >
						<Title order={4}>Средняя дневная калорийность за период</Title>
							<CalendarForAverageDailyCalories />
							<Center>
								<Text fw={600} size="lg" c="orange.6" >
									{meanCaloriesInterval} ккал
								</Text>
							</Center>
				</Paper>

				{userGoals && (
					<Paper p="xl" radius="md" withBorder>
						<Stack gap="md">
							<Title order={4}>Текущие цели</Title>
							<Group grow>
								<Paper
									p="md"
									radius="md"
									withBorder
									bd="1px solid #ff7428"
									onClick={openCaloriesModal}
									style={{ cursor: "pointer" }}
								>
									<Stack gap="0" align="center">
										<Text size="sm" c="dimmed" fw={500}>
											Калории
										</Text>
										<Divider my="3px" w="100%" />
										<Text size="xl" fw={700} c="orange.6">
											{userGoals.caloriesGoal}
										</Text>
										<Text size="xs" c="dimmed">
											ккал/день
										</Text>
									</Stack>
								</Paper>
								<Paper
									p="md"
									radius="md"
									withBorder
									bd="1px solid #3d7cff"
									onClick={openProteinModal}
									style={{ cursor: "pointer" }}
								>
									<Stack gap="0" align="center">
										<Text size="sm" c="dimmed" fw={500}>
											Белок
										</Text>
										<Divider my="3px" w="100%" />
										<Text size="xl" fw={700} c="blue.6">
											{userGoals.proteinGoal}
										</Text>
										<Text size="xs" c="dimmed">
											г/день
										</Text>
									</Stack>
								</Paper>
							</Group>
						</Stack>
					</Paper>
				)}

				<Modal opened={caloriesModalOpened} onClose={closeCaloriesModal} withCloseButton={false}>
					<form
						onSubmit={(event) => {
							event.preventDefault();
							handleSaveCaloriesGoal();
						}}
					>
						<NumberInput
							autoFocus
							onFocusCapture={(event) => {
								event.currentTarget.select();
							}}
							label="Цель по калориям"
							min={1}
							value={caloriesGoal}
							onChange={setCaloriesGoal}
							styles={{
								label: { color: "#ff7428", marginBottom: "0.5rem" },
							}}
						/>
						<Group justify="flex-end" mt="md">
							<Button type="submit" onClick={handleSaveCaloriesGoal}>
								Сохранить
							</Button>
						</Group>
					</form>
				</Modal>

				<Modal opened={proteinModalOpened} onClose={closeProteinModal} withCloseButton={false}>
					<form
						onSubmit={(event) => {
							event.preventDefault();
							handleSaveProteinGoal();
						}}
					>
						<NumberInput
							autoFocus
							onFocusCapture={(event) => {
								event.currentTarget.select();
							}}
							label="Цель по белку (г)"
							min={1}
							value={proteinGoal}
							onChange={setProteinGoal}
							styles={{
								label: { color: "#3d7cff", marginBottom: "0.5rem" },
							}}
						/>
						<Group justify="flex-end" mt="md">
							<Button type="submit" onClick={handleSaveProteinGoal}>
								Сохранить
							</Button>
						</Group>
					</form>
				</Modal>

				{userGoals && user?.id && (
					<CalorieCalculator
						isLoading={isLoadingGoals}
						onSave={handleSave}
						isSaving={isPending}
						initialParams={userGoals}
					/>
				)}
				<Button
					variant="light"
					color="red"
					leftSection={<IconLogout size={16} />}
					onClick={handleLogout}
					fullWidth
				>
					Выйти
				</Button>
			</Stack>
			<Space h="100px" />
		</Container>
	);
}
