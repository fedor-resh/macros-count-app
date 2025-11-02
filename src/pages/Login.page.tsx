import { Container, Stack, Title } from "@mantine/core";
import { AuthenticationForm } from "../components/Auth/AuthenticationForm";

export function LoginPage() {
	return (
		<Container size="xs" py="xl">
			<Stack gap="lg">
				<Title order={2} ta="center">
					Macros Count App
				</Title>
				<AuthenticationForm />
			</Stack>
		</Container>
	);
}
