import { Badge, Group, Loader, Text } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import { getStoreHealth } from './storeHealth.functions'

export function StoreHealth() {
  const health = useQuery({
    queryKey: ['storeHealth'],
    queryFn: () => getStoreHealth(),
    refetchInterval: 30_000,
  })

  if (health.isPending) return <Loader size="sm" />

  return (
    <Group gap="xs">
      <Text>Store</Text>
      <Badge color={health.data?.store === 'serving' ? 'green' : 'red'} variant="light">
        {health.data?.store ?? 'unavailable'}
      </Badge>
    </Group>
  )
}
