import { useState } from 'react';
import { IconDeviceFloppy } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { Button, Container, NumberInput, Stack, Text, TextInput, Title } from '@mantine/core';
import { useAuth } from '../contexts/AuthContext';
import { useAddFoodMutation } from '../store/api/supabaseApi';

interface FormData {
  name: string;
  weight: number | '';
  calories: number | '';
  protein: number | '';
}

export function AddFoodPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    weight: '',
    calories: '',
    protein: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [addFood, { isLoading: loading }] = useAddFoodMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      setError('Пользователь не авторизован');
      return;
    }

    try {
      const result = await addFood({
        protein: Number(formData.protein),
        kcalories: Number(formData.calories),
        name: formData.name,
        value: Number(formData.weight),
        date: new Date().toISOString().split('T')[0],
        user_id: user.id,
        unit: 'г',
      });

      if ('error' in result) {
        throw new Error('Ошибка при сохранении продукта');
      }

      // Navigate back to home on success
      navigate('/');
    } catch (err: any) {
      setError('Ошибка при сохранении продукта. Попробуйте снова.');
    }
  };

  return (
    <Container size="sm" py="xl">
      <Stack gap="lg">
        <Title order={2}>Добавить продукт</Title>

        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            {error && (
              <Text c="red" size="sm">
                {error}
              </Text>
            )}
            <TextInput
              label="Название продукта"
              placeholder="Например: Каша"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              styles={{
                label: { color: '#d9d9d9' },
                input: { backgroundColor: '#1a1a1a', color: '#d9d9d9', borderColor: '#3a3a3a' },
              }}
            />

            <NumberInput
              label="Вес"
              placeholder="Например: 100г"
              required
              value={formData.weight}
              onChange={(value) =>
                setFormData({ ...formData, weight: typeof value === 'number' ? value : '' })
              }
              styles={{
                label: { color: '#d9d9d9' },
                input: { backgroundColor: '#1a1a1a', color: '#d9d9d9', borderColor: '#3a3a3a' },
              }}
            />

            <NumberInput
              label="Калории на 100г"
              placeholder="300"
              required
              min={0}
              value={formData.calories}
              onChange={(value) =>
                setFormData({ ...formData, calories: typeof value === 'number' ? value : '' })
              }
              styles={{
                label: { color: '#ff7428' },
                input: { backgroundColor: '#1a1a1a', color: '#ff7428', borderColor: '#3a3a3a' },
              }}
              suffix=" ккал"
            />

            <NumberInput
              label="Белки на 100г"
              placeholder="21"
              required
              min={0}
              value={formData.protein}
              onChange={(value) =>
                setFormData({ ...formData, protein: typeof value === 'number' ? value : '' })
              }
              styles={{
                label: { color: '#3d7cff' },
                input: { backgroundColor: '#1a1a1a', color: '#3d7cff', borderColor: '#3a3a3a' },
              }}
              suffix=" г"
            />

            <Button
              type="submit"
              size="lg"
              leftSection={<IconDeviceFloppy size={20} />}
              style={{ backgroundColor: '#ff7428' }}
              c="#2a2a2a"
              fullWidth
              mt="md"
              loading={loading}
              disabled={loading}
            >
              Сохранить
            </Button>
          </Stack>
        </form>

        <Button variant="subtle" onClick={() => navigate('/')}>
          Отмена
        </Button>
      </Stack>
    </Container>
  );
}
