import { useEffect, useState } from 'react';
import { IconPlus } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { ActionIcon, Container, Loader, Stack, Text } from '@mantine/core';
import { CircularGraph } from '../components/MacrosTracker/CircularGraph';
import { FoodItem, FoodList } from '../components/MacrosTracker/FoodList';
import { WeeklyProgress } from '../components/MacrosTracker/WeeklyProgress';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCalories, setTotalCalories] = useState(0);
  const [totalProtein, setTotalProtein] = useState(0);

  useEffect(() => {
    if (!user) {
      return;
    }

    const fetchFoodItems = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];

        const { data, error } = await supabase
          .from('eaten_product')
          .select('name, value, unit, kcalories, protein')
          .eq('user_id', user.id)
          .eq('date', today)
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        // Transform data to FoodItem format
        const items: FoodItem[] =
          data?.map((item) => ({
            name: item.name,
            weight: `${item.value}${item.unit}`,
            calories: `${item.kcalories}к`,
            protein: `${item.protein}г`,
          })) || [];

        setFoodItems(items);

        // Calculate totals
        const calories =
          data?.reduce((sum, item) => sum + ((item.kcalories * item.value) / 100 || 0), 0) || 0;
        const protein =
          data?.reduce((sum, item) => sum + ((item.protein * item.value) / 100 || 0), 0) || 0;

        setTotalCalories(Math.round(calories));
        setTotalProtein(Math.round(protein));
      } finally {
        setLoading(false);
      }
    };

    fetchFoodItems();
  }, [user]);

  if (loading) {
    return (
      <Container size="sm" py="xl">
        <Stack align="center" gap="md">
          <Loader size="lg" />
          <Text>Загрузка...</Text>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="sm" py="xl" px="0" my="0">
      <Stack gap="xl">
        <CircularGraph calories={totalCalories} protein={totalProtein} />
        <WeeklyProgress />
        <FoodList items={foodItems} />
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
        onClick={() => navigate('/add-food')}
      >
        <IconPlus size={32} stroke={2} color="#2a2a2a" />
      </ActionIcon>
    </Container>
  );
}
