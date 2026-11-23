import { Container, Stack, Title } from '@mantine/core';
import { createFileRoute } from '@tanstack/react-router';
import { StoreHealth } from './features/storeHealth/StoreHealth';

export const Route = createFileRoute('/')({
  component: HomePage,
});

// TODO(M2): verified locally on the production build (M1); repeat PWA install, offline app-shell load, and the update prompt
// on real devices over HTTPS.
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
