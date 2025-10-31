import { IconCalendar, IconLogout } from '@tabler/icons-react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AppShell,
  Avatar,
  Burger,
  Button,
  Container,
  Group,
  NavLink,
  Stack,
  UnstyledButton,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useDisclosure } from '@mantine/hooks';
import { useAuthStore } from '../../stores/authStore';
import { useDateStore } from '../../stores/dateStore';

export function AppLayout() {
  const [opened, { toggle }] = useDisclosure();
  const navigate = useNavigate();
  const location = useLocation();
  const signOut = useAuthStore((state) => state.signOut);
  const user = useAuthStore((state) => state.user);
  const { selectedDate, setSelectedDate } = useDateStore();

  const handleLogout = async () => {
    await signOut();
  };

  const navItems = [{ path: '/', label: 'Главная' }];

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 300,
        breakpoint: 'sm',
        collapsed: { mobile: !opened },
      }}
      padding="sm"
    >
      <AppShell.Header>
        <Group h="100%" px="md" align="center" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          </Group>
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

      <AppShell.Navbar p="md">
        <Stack justify="space-between" h="100%">
          <Stack gap={0}>
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                label={item.label}
                active={location.pathname === item.path}
                onClick={() => {
                  navigate(item.path);
                  if (opened) {
                    toggle();
                  }
                }}
              />
            ))}
          </Stack>

          <Button
            variant="subtle"
            color="red"
            leftSection={<IconLogout size={16} />}
            onClick={handleLogout}
            fullWidth
          >
            Выйти
          </Button>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        <Container size="500px" px="0" my="0">
          <Outlet />
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
