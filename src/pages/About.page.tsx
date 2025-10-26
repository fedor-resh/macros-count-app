import { Container, Text, Title } from '@mantine/core';

export function AboutPage() {
  return (
    <Container>
      <Title order={1} mb="md">
        About
      </Title>
      <Text>
        This is a macros counting application built with React, Mantine, and React Router.
      </Text>
    </Container>
  );
}
