import { useMemo, useState } from 'react';
import { IconPlus } from '@tabler/icons-react';
import { ActionIcon, Container, Stack } from '@mantine/core';
import { useGetTodayFoodsQuery, useGetUserGoalsQuery } from '../api/supabaseQueries';
import { AddProductDrawer } from '../components/MacrosTracker/AddProductDrawer';
import { CircularGraph } from '../components/MacrosTracker/CircularGraph';
import { FoodList } from '../components/MacrosTracker/FoodList';
import { ProductDrawer } from '../components/MacrosTracker/ProductDrawer';
import { WeeklyProgress } from '../components/MacrosTracker/WeeklyProgress';
import { useAuthStore } from '../stores/authStore';
import { useDateStore } from '../stores/dateStore';

export function HomePage() {
  const user = useAuthStore((state) => state.user);
  const selectedDate = useDateStore((state) => state.selectedDate);
  const { data: eatenProducts = [] } = useGetTodayFoodsQuery(
    user?.id ?? '',
    selectedDate || new Date().toISOString().split('T')[0]
  );
  const { data: userGoals } = useGetUserGoalsQuery(user?.id || '');

  const [selectedProductIndex, setSelectedProductIndex] = useState<number | null>(null);
  const [editDrawerOpened, setEditDrawerOpened] = useState(false);
  const [addDrawerOpened, setAddDrawerOpened] = useState(false);

  const foodItems = useMemo(
    () =>
      eatenProducts.map((item) => ({
        name: item.name,
        weight: `${item.value}${item.unit}`,
        calories: `${item.kcalories}к`,
        protein: `${item.protein}г`,
      })),
    [eatenProducts]
  );

  const { totalCalories, totalProtein } = useMemo(() => {
    const calories =
      eatenProducts.reduce((sum, item) => sum + ((item.kcalories! * item.value!) / 100 || 0), 0) ||
      0;
    const protein =
      eatenProducts.reduce((sum, item) => sum + ((item.protein! * item.value!) / 100 || 0), 0) || 0;

    return {
      totalCalories: Math.round(calories),
      totalProtein: Math.round(protein),
    };
  }, [eatenProducts]);

  const handleItemClick = (index: number) => {
    setSelectedProductIndex(index);
    setEditDrawerOpened(true);
  };

  const handleEditDrawerClose = () => {
    setEditDrawerOpened(false);
    setSelectedProductIndex(null);
  };

  const handleAddDrawerClose = () => {
    setAddDrawerOpened(false);
  };

  const selectedProduct =
    selectedProductIndex !== null ? eatenProducts[selectedProductIndex] : null;

  const caloriesGoal = userGoals?.calories_goal || 3000;
  const proteinGoal = userGoals?.protein_goal || 150;

  return (
    <Container size="sm" py="xl" px="0" my="0">
      <Stack gap="xl">
        <CircularGraph
          calories={totalCalories}
          protein={totalProtein}
          caloriesGoal={caloriesGoal}
          proteinGoal={proteinGoal}
        />
        <WeeklyProgress
          userId={user?.id ?? ''}
          caloriesGoal={caloriesGoal}
          proteinGoal={proteinGoal}
        />
        <FoodList items={foodItems} onItemClick={handleItemClick} />
      </Stack>

      {/* Floating Action Button */}
      <ActionIcon
        size={60}
        radius="md"
        color="#ff7428"
        style={{
          position: 'fixed',
          bottom: 32,
          right: 32,
          backgroundColor: '#ff7428',
        }}
        aria-label="Add food item"
        onClick={() => setAddDrawerOpened(true)}
      >
        <IconPlus size={32} stroke={2} color="#2a2a2a" />
      </ActionIcon>

      <ProductDrawer
        opened={editDrawerOpened}
        onClose={handleEditDrawerClose}
        product={selectedProduct}
      />

      <AddProductDrawer
        opened={addDrawerOpened}
        onClose={handleAddDrawerClose}
        selectedDate={selectedDate || new Date().toISOString().split('T')[0]}
      />
    </Container>
  );
}
