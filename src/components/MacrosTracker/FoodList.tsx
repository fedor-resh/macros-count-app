import { Box, Group, Paper, Stack, Text } from '@mantine/core';

export interface FoodItem {
  name: string;
  weight: string;
  calories: string;
  protein: string;
}

interface FoodListProps {
  items: FoodItem[];
}

export function FoodList({ items }: FoodListProps) {
  return (
    <Stack gap="xs">
      {/* Header */}
      <Group gap="md" px="md">
        <Text size="md" c="#d9d9d9" style={{ width: 112 }}>
          Продукт
        </Text>
        <Text size="md" c="#d9d9d9" style={{ flex: 1 }}>
          Вес
        </Text>
        <Text size="md" c="#ff7428" style={{ flex: 1 }}>
          Кал
        </Text>
        <Text size="md" c="#3d7cff" style={{ flex: 1 }}>
          Белки
        </Text>
      </Group>

      {/* Food Items */}
      {items.length === 0 && (
        <Text size="md" c="#d9d9d9" style={{ width: '100%' }}>
          Нет продуктов
        </Text>
      )}
      {items.map((item, index) => (
        <Paper key={index} bg="#2a2a2a" p="sm" radius="md">
          <Group gap="md">
            <Text size="md" c="#d9d9d9" style={{ width: 112 }}>
              {item.name}
            </Text>
            <Text size="md" c="#d9d9d9" style={{ flex: 1 }}>
              {item.weight}
            </Text>
            <Text size="md" c="#ff7428" style={{ flex: 1 }}>
              {item.calories}
            </Text>
            <Text size="md" c="#3d7cff" style={{ flex: 1 }}>
              {item.protein}
            </Text>
          </Group>
        </Paper>
      ))}
    </Stack>
  );
}
