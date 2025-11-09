import { IconLogout } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import { Avatar, Button, Container, Group, Paper, Space, Stack, Text, Title } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useGetUserGoalsQuery, useUpdateUserGoalsMutation } from "../api/userQueries";
import { CalorieCalculator } from "../components/Profile/CalorieCalculator";
import { useAuthStore } from "../stores/authStore";

export function ProfilePage() {
	const navigate = useNavigate();
	const user = useAuthStore((state) => state.user);
	const signOut = useAuthStore((state) => state.signOut);
	const { data: userGoals, isLoading: isLoadingGoals } = useGetUserGoalsQuery();
	const { mutate: updateGoals, isPending } = useUpdateUserGoalsMutation();

	const displayName = user?.user_metadata?.full_name || user?.email || "User";
	const email = user?.email || "";
	const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

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

	return (
		<Container size="sm" py="xl" px="0" my="0">
			<Stack gap="xl">
				<Title order={1}>Профиль</Title>

				<Paper p="xl" radius="md" withBorder>
					<Stack align="center" gap="md">
						<Avatar src={avatarUrl} alt={displayName} name={displayName} radius="xl" size={120} />
						<Stack align="center" gap="xs">
							<Title order={3}>{displayName}</Title>
							{email && <Text c="dimmed">{email}</Text>}
						</Stack>
					</Stack>
				</Paper>

				{userGoals && (
					<Paper p="xl" radius="md" withBorder>
						<Stack gap="md">
							<Title order={4}>Текущие цели</Title>
							<Group grow>
								<Paper p="md" radius="md" withBorder bd="1px solid #ff7428">
									<Stack gap="xs" align="center">
										<Text size="sm" c="dimmed" fw={500}>
											Калории
										</Text>
										<Text size="xl" fw={700} c="orange.6">
											{userGoals.caloriesGoal}
										</Text>
										<Text size="xs" c="dimmed">
											ккал/день
										</Text>
									</Stack>
								</Paper>
								<Paper p="md" radius="md" withBorder bd="1px solid #3d7cff">
									<Stack gap="xs" align="center">
										<Text size="sm" c="dimmed" fw={500}>
											Белок
										</Text>
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
