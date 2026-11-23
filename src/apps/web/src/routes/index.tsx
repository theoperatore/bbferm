import { Container, Stack, Title } from '@mantine/core';
import { createFileRoute } from '@tanstack/react-router';
import { StoreHealth } from './features/storeHealth/StoreHealth';

export const Route = createFileRoute('/')({
  component: HomePage,
});

// TODO(M1): on a production build served over HTTPS, verify PWA install, offline app-shell load, and the update prompt.
// TODO(M5): replace with the fermentation dashboard once Store serves measurements.
function HomePage() {
  return (
    <Container size="md" py="xl">
      <Stack>
        <Title order={1}>BBFerm</Title>
        <StoreHealth />
      </Stack>
    </Container>
  );
}
