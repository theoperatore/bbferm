import { Container, Stack, Title } from '@mantine/core'
import { createFileRoute } from '@tanstack/react-router'
import { LatestReadings } from './features/latestReadings/LatestReadings'

export const Route = createFileRoute('/')({
  component: DashboardPage,
})

function DashboardPage() {
  return (
    <Container size="md" py="xl">
      <Stack>
        <Title order={1}>BBFerm</Title>
        <LatestReadings />
      </Stack>
    </Container>
  )
}
