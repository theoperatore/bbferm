import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { conditions: ['@bbferm/source'] },
  ssr: { resolve: { conditions: ['@bbferm/source'] } },
});
