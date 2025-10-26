import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Anchor,
  Button,
  Checkbox,
  Divider,
  Group,
  Paper,
  PaperProps,
  PasswordInput,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { upperFirst, useToggle } from '@mantine/hooks';
import { useAuth } from '../../contexts/AuthContext';
import {
  useSignInMutation,
  useSignInWithGoogleMutation,
  useSignUpMutation,
} from '../../store/api/supabaseApi';
import { GoogleButton } from './GoogleButton';

export function AuthenticationForm(props: PaperProps) {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [type, toggle] = useToggle(['login', 'register']);
  const [error, setError] = useState<string | null>(null);

  const [signIn, { isLoading: isSigningIn }] = useSignInMutation();
  const [signUp, { isLoading: isSigningUp }] = useSignUpMutation();
  const [signInWithGoogle, { isLoading: isGoogleLoading }] = useSignInWithGoogleMutation();

  const loading = isSigningIn || isSigningUp || isGoogleLoading;

  // Redirect if already logged in
  useEffect(() => {
    if (session) {
      navigate('/');
    }
  }, [session, navigate]);

  const form = useForm({
    initialValues: {
      email: '',
      name: '',
      password: '',
      terms: true,
    },

    validate: {
      email: (val) => (/^\S+@\S+$/.test(val) ? null : 'Invalid email'),
      password: (val) => (val.length <= 6 ? 'Password should include at least 6 characters' : null),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setError(null);

    try {
      if (type === 'register') {
        const result = await signUp({
          email: values.email,
          password: values.password,
          name: values.name,
        });

        if ('error' in result) {
          const errorMsg =
            typeof result.error === 'object' &&
            result.error !== null &&
            'error' in result.error &&
            typeof result.error.error === 'string'
              ? result.error.error
              : 'Произошла ошибка при регистрации';
          throw new Error(errorMsg);
        }

        setError('Проверьте вашу почту для подтверждения регистрации');
      } else {
        const result = await signIn({
          email: values.email,
          password: values.password,
        });

        if ('error' in result) {
          const errorMsg =
            typeof result.error === 'object' &&
            result.error !== null &&
            'error' in result.error &&
            typeof result.error.error === 'string'
              ? result.error.error
              : 'Произошла ошибка при входе';
          throw new Error(errorMsg);
        }

        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка при аутентификации');
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);

    try {
      const result = await signInWithGoogle();

      if ('error' in result) {
        const errorMsg =
          typeof result.error === 'object' &&
          result.error !== null &&
          'error' in result.error &&
          typeof result.error.error === 'string'
            ? result.error.error
            : 'Ошибка при входе через Google';
        throw new Error(errorMsg);
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка при входе через Google');
    }
  };

  return (
    <Paper radius="md" p="lg" withBorder {...props}>
      <Text size="lg" fw={500}>
        Добро пожаловать, {type === 'login' ? 'войдите' : 'зарегистрируйтесь'}
      </Text>

      <GoogleButton
        radius="xl"
        onClick={handleGoogleLogin}
        disabled={loading}
        fullWidth
        mb="md"
        mt="md"
      >
        Google
      </GoogleButton>

      <Divider label="Или используйте email" labelPosition="center" my="lg" />

      {error && (
        <Text c="red" size="sm" mb="md">
          {error}
        </Text>
      )}

      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          {type === 'register' && (
            <TextInput
              label="Имя"
              placeholder="Ваше имя"
              value={form.values.name}
              onChange={(event) => form.setFieldValue('name', event.currentTarget.value)}
              radius="md"
              disabled={loading}
            />
          )}

          <TextInput
            required
            label="Email"
            placeholder="hello@example.com"
            value={form.values.email}
            onChange={(event) => form.setFieldValue('email', event.currentTarget.value)}
            error={form.errors.email && 'Неверный email'}
            radius="md"
            disabled={loading}
          />

          <PasswordInput
            required
            label="Пароль"
            placeholder="Ваш пароль"
            value={form.values.password}
            onChange={(event) => form.setFieldValue('password', event.currentTarget.value)}
            error={form.errors.password && 'Пароль должен содержать минимум 6 символов'}
            radius="md"
            disabled={loading}
          />

          {type === 'register' && (
            <Checkbox
              label="Я принимаю условия использования"
              checked={form.values.terms}
              onChange={(event) => form.setFieldValue('terms', event.currentTarget.checked)}
              disabled={loading}
            />
          )}
        </Stack>

        <Group justify="space-between" mt="xl">
          <Anchor
            component="button"
            type="button"
            c="dimmed"
            onClick={() => toggle()}
            size="xs"
            disabled={loading}
          >
            {type === 'register' ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
          </Anchor>
          <Button type="submit" radius="xl" loading={loading} disabled={loading}>
            {upperFirst(type === 'login' ? 'Войти' : 'Регистрация')}
          </Button>
        </Group>
      </form>
    </Paper>
  );
}
