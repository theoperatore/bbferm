import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button, Group, Notification } from '@mantine/core'

/** Registers the service worker and offers a reload when a new version is ready. */
export function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <Notification
      title="Update available"
      onClose={() => setNeedRefresh(false)}
      style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 1000 }}
    >
      <Group mt="xs">
        <Button size="xs" onClick={() => updateServiceWorker(true)}>
          Reload
        </Button>
      </Group>
    </Notification>
  )
}
