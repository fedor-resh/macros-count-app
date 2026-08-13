import {
	Anchor,
	Button,
	Checkbox,
	Divider,
	Group,
	Paper,
	type PaperProps,
	PasswordInput,
	Stack,
	Text,
	TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { upperFirst, useToggle } from "@mantine/hooks";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSignInMutation, useSignUpMutation } from "../../api/userQueries";
import { googleStartUrl } from "../../lib/authClient";
import { useAuthStore } from "../../stores/authStore";
import { GoogleButton } from "./GoogleButton";

const googleEnabled = import.meta.env.VITE_GOOGLE_AUTH === "true";

export function AuthenticationForm(props: PaperProps) {
	const navigate = useNavigate();
	const user = useAuthStore((state) => state.user);
	const [type, toggle] = useToggle(["login", "register"]);
	const [error, setError] = useState<string | null>(null);

	const { mutate: signIn, isPending: isSigningIn } = useSignInMutation();
	const { mutate: signUp, isPending: isSigningUp } = useSignUpMutation();

	const loading = isSigningIn || isSigningUp;

	useEffect(() => {
		if (user) {
			navigate("/");
		}
	}, [user, navigate]);

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		if (params.get("error") === "google") {
			setError("Ошибка при входе через Google");
		}
	}, []);

	const form = useForm({
		initialValues: {
			email: "",
			password: "",
			terms: true,
		},

		validate: {
			email: (val: string) => (/^\S+@\S+$/.test(val) ? null : "Invalid email"),
			password: (val: string) =>
				val.length < 6 ? "Password should include at least 6 characters" : null,
		},
	});

	const handleSubmit = (values: typeof form.values) => {
		setError(null);

		if (type === "register") {
			signUp(
				{ email: values.email, password: values.password },
				{
					onSuccess: () => {
						navigate("/");
					},
					onError: (err: unknown) => {
						setError(err instanceof Error ? err.message : "Произошла ошибка при регистрации");
					},
				},
			);
		} else {
			signIn(
				{ email: values.email, password: values.password },
				{
					onSuccess: () => {
						navigate("/");
					},
					onError: (err: unknown) => {
						setError(err instanceof Error ? err.message : "Произошла ошибка при входе");
					},
				},
			);
		}
	};

	const handleGoogleLogin = () => {
		window.location.assign(googleStartUrl());
	};

	return (
		<Paper radius="md" p="lg" withBorder {...props}>
			<Text size="lg" fw={500}>
				Добро пожаловать, {type === "login" ? "войдите" : "зарегистрируйтесь"}
			</Text>

			{googleEnabled && (
				<>
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
				</>
			)}

			{error && (
				<Text c="red" size="sm" mb="md" mt={googleEnabled ? undefined : "md"}>
					{error}
				</Text>
			)}

			<form onSubmit={form.onSubmit(handleSubmit)}>
				<Stack>
					<TextInput
						required
						label="Email"
						placeholder="hello@example.com"
						value={form.values.email}
						onChange={(event) => form.setFieldValue("email", event.currentTarget.value)}
						error={form.errors.email && "Неверный email"}
						radius="md"
						disabled={loading}
					/>

					<PasswordInput
						required
						label="Пароль"
						placeholder="Ваш пароль"
						value={form.values.password}
						onChange={(event) => form.setFieldValue("password", event.currentTarget.value)}
						error={form.errors.password && "Пароль должен содержать минимум 6 символов"}
						radius="md"
						disabled={loading}
					/>

					{type === "register" && (
						<Checkbox
							label="Я принимаю условия использования"
							checked={form.values.terms}
							onChange={(event) => form.setFieldValue("terms", event.currentTarget.checked)}
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
						{type === "register" ? "Уже есть аккаунт? Войти" : "Нет аккаунта? Зарегистрироваться"}
					</Anchor>
					<Button type="submit" radius="xl" loading={loading} disabled={loading}>
						{upperFirst(type === "login" ? "Войти" : "Регистрация")}
					</Button>
				</Group>
			</form>
		</Paper>
	);
}
