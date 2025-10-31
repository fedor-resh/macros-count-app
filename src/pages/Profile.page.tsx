import { useEffect, useState } from 'react';
import {
  Avatar,
  Button,
  Container,
  Divider,
  Group,
  NumberInput,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useGetUserGoalsQuery, useUpdateUserGoalsMutation } from '../api/supabaseQueries';
import { useAuthStore } from '../stores/authStore';
import {
  calculateGoals,
  type ActivityLevel,
  type Gender,
  type Goal,
} from '../utils/calorieCalculator';

const STORAGE_KEY = 'calorie-calculator-params';

interface CalculatorParams {
  weight: number | null;
  height: number | null;
  age: number | null;
  gender: Gender;
  activityLevel: ActivityLevel;
  goal: Goal;
}

function loadParamsFromStorage(): Partial<CalculatorParams> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore errors when loading from storage
  }
  return {};
}

function saveParamsToStorage(params: CalculatorParams) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(params));
  } catch {
    // Ignore errors when saving to storage
  }
}

export function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  const { data: userGoals, isLoading: isLoadingGoals } = useGetUserGoalsQuery(user?.id || '');
  const { mutate: updateGoals, isPending } = useUpdateUserGoalsMutation();

  const displayName = user?.user_metadata?.full_name || user?.email || 'User';
  const email = user?.email || '';
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

  const [calculatedResults, setCalculatedResults] = useState<{
    caloriesGoal: number;
    proteinGoal: number;
    bmr: number;
    tdee: number;
  } | null>(null);

  const savedParams = loadParamsFromStorage();

  const form = useForm<CalculatorParams>({
    mode: 'controlled',
    initialValues: {
      weight: savedParams.weight ?? null,
      height: savedParams.height ?? null,
      age: savedParams.age ?? null,
      gender: savedParams.gender ?? 'male',
      activityLevel: savedParams.activityLevel ?? 'moderate',
      goal: savedParams.goal ?? 'maintain',
    },
    validate: {
      weight: (value) => (value && value > 0 ? null : 'Вес должен быть больше 0'),
      height: (value) => (value && value > 0 ? null : 'Рост должен быть больше 0'),
      age: (value) => (value && value > 0 ? null : 'Возраст должен быть больше 0'),
    },
  });

  // Сохраняем параметры в localStorage при изменении
  useEffect(() => {
    const params: CalculatorParams = {
      weight: form.values.weight,
      height: form.values.height,
      age: form.values.age,
      gender: form.values.gender,
      activityLevel: form.values.activityLevel,
      goal: form.values.goal,
    };
    saveParamsToStorage(params);
  }, [form.values]);

  const handleCalculate = () => {
    const { weight, height, age, gender, activityLevel, goal } = form.values;

    if (!weight || !height || !age) {
      notifications.show({
        title: 'Ошибка',
        message: 'Заполните все поля для расчёта',
        color: 'red',
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
    if (!user?.id || !calculatedResults) {
      return;
    }

    updateGoals(
      {
        userId: user.id,
        caloriesGoal: calculatedResults.caloriesGoal,
        proteinGoal: calculatedResults.proteinGoal,
      },
      {
        onSuccess: () => {
          notifications.show({
            title: 'Успешно',
            message: 'Цели успешно обновлены',
            color: 'green',
          });
        },
        onError: () => {
          notifications.show({
            title: 'Ошибка',
            message: 'Не удалось обновить цели',
            color: 'red',
          });
        },
      }
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
                      {userGoals.calories_goal}
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
                      {userGoals.protein_goal}
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

        <Paper p="xl" radius="md" withBorder>
          <form onSubmit={form.onSubmit(handleCalculate)}>
            <Stack gap="md">
              <Title order={4}>Калькулятор целей</Title>

              <NumberInput
                label="Вес (кг)"
                placeholder="70"
                min={1}
                max={300}
                disabled={isLoadingGoals}
                {...form.getInputProps('weight')}
                styles={{
                  label: { marginBottom: '0.5rem' },
                }}
              />

              <NumberInput
                label="Рост (см)"
                placeholder="175"
                min={50}
                max={250}
                disabled={isLoadingGoals}
                {...form.getInputProps('height')}
                styles={{
                  label: { marginBottom: '0.5rem' },
                }}
              />

              <NumberInput
                label="Возраст (лет)"
                placeholder="30"
                min={1}
                max={120}
                disabled={isLoadingGoals}
                {...form.getInputProps('age')}
                styles={{
                  label: { marginBottom: '0.5rem' },
                }}
              />

              <div>
                <Text size="sm" fw={500} mb="xs">
                  Пол
                </Text>
                <SegmentedControl
                  fullWidth
                  data={[
                    { label: 'Мужской', value: 'male' },
                    { label: 'Женский', value: 'female' },
                  ]}
                  value={form.values.gender}
                  onChange={(value) => form.setFieldValue('gender', value as Gender)}
                  disabled={isLoadingGoals}
                />
              </div>

              <Select
                label="Уровень активности"
                placeholder="Выберите уровень активности"
                data={[
                  { value: 'sedentary', label: 'Сидячий образ жизни' },
                  { value: 'light', label: 'Легкая активность (1-3 раза в неделю)' },
                  { value: 'moderate', label: 'Умеренная активность (3-5 раз в неделю)' },
                  { value: 'high', label: 'Высокая активность (6-7 раз в неделю)' },
                  { value: 'veryHigh', label: 'Очень высокая активность (2 раза в день)' },
                ]}
                disabled={isLoadingGoals}
                {...form.getInputProps('activityLevel')}
                styles={{
                  label: { marginBottom: '0.5rem' },
                }}
              />

              <Select
                label="Цель"
                placeholder="Выберите цель"
                data={[
                  { value: 'loss', label: 'Похудение' },
                  { value: 'maintain', label: 'Поддержание веса' },
                  { value: 'gain', label: 'Набор массы' },
                ]}
                disabled={isLoadingGoals}
                {...form.getInputProps('goal')}
                styles={{
                  label: { marginBottom: '0.5rem' },
                }}
              />

              <Group justify="flex-end" mt="md">
                <Button type="submit" disabled={isLoadingGoals}>
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
                            caloriesGoal: typeof value === 'number' ? value : Number(value) || 0,
                          }
                        : null
                    )
                  }
                  min={1}
                  styles={{
                    label: { color: '#ff7428', marginBottom: '0.5rem' },
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
                            proteinGoal: typeof value === 'number' ? value : Number(value) || 0,
                          }
                        : null
                    )
                  }
                  min={1}
                  styles={{
                    label: { color: '#3d7cff', marginBottom: '0.5rem' },
                  }}
                />

                <Group justify="flex-end" mt="md">
                  <Button onClick={handleSave} loading={isPending} disabled={isLoadingGoals}>
                    Сохранить цели
                  </Button>
                </Group>
              </Stack>
            </>
          )}
        </Paper>
      </Stack>
    </Container>
  );
}
