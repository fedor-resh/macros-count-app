import { useMemo, useState } from 'react';
import { IconPlus } from '@tabler/icons-react';
import { ActionIcon, Container, Stack } from '@mantine/core';
import { AddProductDrawer } from '../components/MacrosTracker/AddProductDrawer';
import { CircularGraph } from '../components/MacrosTracker/CircularGraph';
import { FoodList } from '../components/MacrosTracker/FoodList';
import { ProductDrawer } from '../components/MacrosTracker/ProductDrawer';
import { WeeklyProgress } from '../components/MacrosTracker/WeeklyProgress';
import { useAuth } from '../contexts/AuthContext';
import { useGetTodayFoodsQuery } from '../store/api/supabaseApi';

export function HomePage() {
  const { user } = useAuth();
  const { data: eatenProducts = [] } = useGetTodayFoodsQuery(user?.id ?? '', {
    skip: !user,
  });

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

  return (
    <Container size="sm" py="xl" px="0" my="0">
      <Stack gap="xl">
        <CircularGraph calories={totalCalories} protein={totalProtein} />
        <WeeklyProgress />
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

      <AddProductDrawer opened={addDrawerOpened} onClose={handleAddDrawerClose} />
    </Container>
  );
}
