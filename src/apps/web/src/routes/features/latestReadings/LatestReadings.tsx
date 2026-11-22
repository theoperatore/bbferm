import { Alert, Badge, Card, Group, Loader, SimpleGrid, Stack, Text } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { celsiusToFahrenheit } from '@bbferm/domain'
import { getLatestReadings } from './latestReadings.functions'
import type { Reading } from './latestReadings.schemas'

export function LatestReadings() {
  const latest = useQuery({
    queryKey: ['readings', 'latest'],
    queryFn: () => getLatestReadings(),
    refetchInterval: 30_000,
  })

  return (
    <Stack>
      {latest.dataUpdatedAt > 0 && (
        <Text size="sm" c="dimmed">
          Updated {new Date(latest.dataUpdatedAt).toLocaleTimeString()}
        </Text>
      )}
      {latest.isPending && <Loader />}
      {latest.isError && (
        <Alert color="red" title="Unable to load readings">
          The server could not reach the data store.{latest.data ? ' Showing last known values.' : ''}
        </Alert>
      )}
      {latest.data?.readings.length === 0 && <Text c="dimmed">No readings yet.</Text>}
      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        {latest.data?.readings.map((reading) => <ReadingCard key={reading.id} reading={reading} />)}
      </SimpleGrid>
    </Stack>
  )
}

type ReadingCardProps = {
  reading: Reading
}

function ReadingCard(props: ReadingCardProps) {
  const { reading } = props
  return (
    <Card withBorder padding="lg">
      <Group justify="space-between" mb="xs">
        <Text fw={600}>Device {reading.deviceId?.slice(0, 8) ?? 'manual'}</Text>
        <Badge variant="light">{reading.source}</Badge>
      </Group>
      <Text size="xl" fw={700}>
        SG {reading.gravity?.toFixed(4) ?? '—'}
      </Text>
      <Text>
        {reading.temperatureC === null
          ? '—'
          : `${reading.temperatureC.toFixed(1)} °C / ${celsiusToFahrenheit(reading.temperatureC).toFixed(1)} °F`}
      </Text>
      <Text size="xs" c="dimmed" mt="xs">
        Received {new Date(reading.receivedAt).toLocaleString()}
      </Text>
    </Card>
  )
}
