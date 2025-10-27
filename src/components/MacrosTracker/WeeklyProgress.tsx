import { useMemo } from 'react';
import { ActionIcon, Box, Group, Paper, RingProgress, Stack, Text } from '@mantine/core';
import { useGetWeeklyFoodsQuery } from '../../api/supabaseQueries';
import { useDateStore } from '../../stores/dateStore';

interface DayProgress {
  day: string;
  date: string;
  caloriesPercent: number;
  proteinPercent: number;
  isActive: boolean;
  onClick: () => void;
}

interface WeeklyProgressProps {
  userId: string;
}

// Daily goals
const DAILY_CALORIES_GOAL = 2000;
const DAILY_PROTEIN_GOAL = 150;

function DayMiniGraph({ day, caloriesPercent, proteinPercent, isActive, onClick }: DayProgress) {
  const content = (
    <Stack gap={4} align="center">
      <Box pos="relative" style={{ width: 20, height: 20 }}>
        <RingProgress
          size={20}
          thickness={1.5}
          sections={[
            { value: caloriesPercent, color: 'orange.6' },
            { value: 100 - caloriesPercent, color: 'gray.8' },
          ]}
        />
        <RingProgress
          size={12}
          thickness={1.5}
          sections={[
            { value: proteinPercent, color: 'blue.6' },
            { value: 100 - proteinPercent, color: 'gray.8' },
          ]}
          style={{
            position: 'absolute',
            top: '40%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        />
      </Box>
      <Text size="13px" c={isActive ? '#d9d9d9' : '#afafaf'} fw={isActive ? 700 : 400}>
        {day}
      </Text>
    </Stack>
  );

  if (isActive) {
    return (
      <ActionIcon
        variant="subtle"
        size="xl"
        radius="md"
        color="orange"
        onClick={onClick}
        style={{ cursor: 'pointer' }}
      >
        {content}
      </ActionIcon>
    );
  }

  return (
    <ActionIcon
      variant="transparent"
      size="xl"
      radius="md"
      onClick={onClick}
      style={{ cursor: 'pointer' }}
    >
      {content}
    </ActionIcon>
  );
}

export function WeeklyProgress({ userId }: WeeklyProgressProps) {
  const { data: weeklyFoods = [] } = useGetWeeklyFoodsQuery(userId);
  const { selectedDate, setSelectedDate } = useDateStore();

  const weekDays: DayProgress[] = useMemo(() => {
    // Generate last 7 days
    const days: DayProgress[] = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      // Get day name in Russian
      const dayNames = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];
      const dayName = dayNames[date.getDay()];

      // Calculate totals for this day
      const dayFoods = weeklyFoods.filter((food) => food.date === dateStr);
      const totalCalories = dayFoods.reduce(
        (sum, item) => sum + ((item.kcalories! * item.value!) / 100 || 0),
        0
      );
      const totalProtein = dayFoods.reduce(
        (sum, item) => sum + ((item.protein! * item.value!) / 100 || 0),
        0
      );

      // Calculate percentages (cap at 100%)
      const caloriesPercent = Math.min(
        Math.round((totalCalories / DAILY_CALORIES_GOAL) * 100),
        100
      );
      const proteinPercent = Math.min(Math.round((totalProtein / DAILY_PROTEIN_GOAL) * 100), 100);

      days.push({
        day: dayName,
        date: dateStr,
        caloriesPercent,
        proteinPercent,
        isActive: dateStr === selectedDate,
        onClick: () => setSelectedDate(dateStr),
      });
    }

    return days;
  }, [weeklyFoods, selectedDate, setSelectedDate]);

  return (
    <Paper bg="#2a2a2a" p="md" radius="md">
      <Stack gap="sm">
        <Box>
          <Text size="md" c="#d9d9d9">
            Ежедневная цель
          </Text>
          <Text size="xs" c="#9d9d9d">
            За 7 дней
          </Text>
        </Box>
        <Group gap="xs" justify="space-between">
          {weekDays.map((dayData) => (
            <DayMiniGraph key={dayData.date} {...dayData} />
          ))}
        </Group>
      </Stack>
    </Paper>
  );
}
