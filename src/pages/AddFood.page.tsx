import { useState } from 'react';
import { IconDeviceFloppy } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Container,
  NumberInput,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export function AddFoodPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    weight: '',
    calories: '',
    protein: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Parse weight value and unit (e.g., "100г" -> value: 100, unit: "г")
      const weightMatch = formData.weight.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
      const value = weightMatch ? parseFloat(weightMatch[1]) : 100;
      const unit = weightMatch ? weightMatch[2] || 'г' : 'г';
      const name = formData.name;

      const { error: insertError } = await supabase.from('eaten_product').insert({
        protein: Number(formData.protein),
        kcalories: Number(formData.calories),
        name,
        unit,
        value,
        date: new Date().toISOString().split('T')[0],
        user_id: user?.id,
      });

      if (insertError) {
        throw insertError;
      }

      // Navigate back to home on success
      navigate('/');
    } catch (err: any) {
      setError('Ошибка при сохранении продукта. Попробуйте снова.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="sm" py="xl">
      <Stack gap="lg">
        <Title order={2}>Добавить продукт</Title>

        <Paper bg="#2a2a2a" p="xl" radius="md">
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

              <TextInput
                label="Вес"
                placeholder="Например: 100г"
                required
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
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
                onChange={(value) => setFormData({ ...formData, calories: String(value) })}
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
                onChange={(value) => setFormData({ ...formData, protein: String(value) })}
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
        </Paper>

        <Button variant="subtle" onClick={() => navigate('/')}>
          Отмена
        </Button>
      </Stack>
    </Container>
  );
}
