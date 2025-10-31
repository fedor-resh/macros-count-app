import { IconCalendar } from '@tabler/icons-react';
import { Outlet, useNavigate } from 'react-router-dom';
import { AppShell, Avatar, Container, Group, UnstyledButton } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import faviconUrl from '../../favicon.svg?url';
import { useAuthStore } from '../../stores/authStore';
import { useDateStore } from '../../stores/dateStore';

export function AppLayout() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { selectedDate, setSelectedDate } = useDateStore();

  return (
    <AppShell header={{ height: 60 }} padding="sm">
      <AppShell.Header>
        <Group h="100%" px="md" align="center" justify="space-between">
          <UnstyledButton
            onClick={() => navigate('/')}
            style={{ display: 'flex', alignItems: 'center' }}
          >
            <img src={faviconUrl} alt="Home" style={{ width: 32, height: 32, cursor: 'pointer' }} />
          </UnstyledButton>
          <Group gap="xs">
            <DatePickerInput
              value={selectedDate}
              onChange={setSelectedDate}
              placeholder="Выберите дату"
              locale="ru"
              valueFormat="DD.MM.YYYY"
              leftSection={<IconCalendar size={18} stroke={1.5} />}
              styles={{
                root: {
                  width: 'min-content',
                },
                input: {
                  border: '0',
                },
              }}
            />
            <UnstyledButton onClick={() => navigate('/profile')}>
              <Avatar
                src={user?.user_metadata?.avatar_url || user?.user_metadata?.picture}
                alt={user?.user_metadata?.full_name || user?.email || 'User'}
                name={user?.user_metadata?.full_name || user?.email || 'User'}
                radius="xl"
                size="md"
                style={{ cursor: 'pointer' }}
              />
            </UnstyledButton>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        <Container size="500px" px="0" my="0">
          <Outlet />
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
