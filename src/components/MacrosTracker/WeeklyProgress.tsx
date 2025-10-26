import { Box, Group, Paper, RingProgress, Stack, Text } from '@mantine/core';

interface DayProgress {
  day: string;
  caloriesPercent: number;
  proteinPercent: number;
}

const weekDays: DayProgress[] = [
  { day: 'ПН', caloriesPercent: 25, proteinPercent: 50 },
  { day: 'ВТ', caloriesPercent: 25, proteinPercent: 50 },
  { day: 'СР', caloriesPercent: 25, proteinPercent: 50 },
  { day: 'ЧТ', caloriesPercent: 25, proteinPercent: 50 },
  { day: 'ПТ', caloriesPercent: 25, proteinPercent: 50 },
  { day: 'СБ', caloriesPercent: 25, proteinPercent: 50 },
  { day: 'ВС', caloriesPercent: 25, proteinPercent: 50 },
];

function DayMiniGraph({ day, caloriesPercent, proteinPercent }: DayProgress) {
  return (
    <Stack gap={4} align="center">
      <Box pos="relative" style={{ width: 20, height: 20 }}>
        <RingProgress
          size={20}
          thickness={1.5}
          sections={[
            { value: caloriesPercent, color: '#ff7428' },
            { value: 100 - caloriesPercent, color: '#e2f5f1' },
          ]}
        />
        <RingProgress
          size={12}
          thickness={1.5}
          sections={[
            { value: proteinPercent, color: '#3d7cff' },
            { value: 100 - proteinPercent, color: '#e9eef6' },
          ]}
          style={{
            position: 'absolute',
            top: '19%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        />
      </Box>
      <Text size="13px" c="#afafaf">
        {day}
      </Text>
    </Stack>
  );
}

export function WeeklyProgress() {
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
        <Group gap="md" justify="space-between">
          {weekDays.map((dayData) => (
            <DayMiniGraph key={dayData.day} {...dayData} />
          ))}
        </Group>
      </Stack>
    </Paper>
  );
}
