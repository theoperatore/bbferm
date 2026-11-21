import { Alert, Badge, Card, Container, Group, Loader, SimpleGrid, Stack, Text, Title } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { celsiusToFahrenheit } from '@bbferm/domain'
import { getLatestMeasurements } from '../server/measurements.functions'

export const Route = createFileRoute('/')({
  component: Dashboard,
})

function Dashboard() {
  const latest = useQuery({
    queryKey: ['measurements', 'latest'],
    queryFn: () => getLatestMeasurements(),
    refetchInterval: 30_000,
  })

  return (
    <Container size="md" py="xl">
      <Stack>
        <Group justify="space-between">
          <Title order={1}>BBFerm</Title>
          {latest.dataUpdatedAt > 0 && (
            <Text size="sm" c="dimmed">
              Updated {new Date(latest.dataUpdatedAt).toLocaleTimeString()}
            </Text>
          )}
        </Group>

        {latest.isPending && <Loader />}
        {latest.isError && (
          <Alert color="red" title="Unable to load readings">
            The server could not reach the data store.{latest.data ? ' Showing last known values.' : ''}
          </Alert>
        )}
        {latest.data?.measurements.length === 0 && <Text c="dimmed">No readings yet.</Text>}

        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          {latest.data?.measurements.map((m) => (
            <Card key={m.id} withBorder padding="lg">
              <Group justify="space-between" mb="xs">
                <Text fw={600}>Device {m.deviceId?.slice(0, 8) ?? 'manual'}</Text>
                <Badge variant="light">{m.source}</Badge>
              </Group>
              <Text size="xl" fw={700}>
                SG {m.gravity?.toFixed(4) ?? '—'}
              </Text>
              <Text>
                {m.temperatureC === null
                  ? '—'
                  : `${m.temperatureC.toFixed(1)} °C / ${celsiusToFahrenheit(m.temperatureC).toFixed(1)} °F`}
              </Text>
              <Text size="xs" c="dimmed" mt="xs">
                Received {new Date(m.receivedAt).toLocaleString()}
              </Text>
            </Card>
          ))}
        </SimpleGrid>
      </Stack>
    </Container>
  )
}
