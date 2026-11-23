import '@tanstack/react-start/server-only';
import { type GetHealthRequest, GetHealthResponse, storeRoutes } from '@bbferm/store-schema';
import { storeClient } from './client';

export async function getHealth(request: GetHealthRequest) {
  return storeClient().get(storeRoutes.health, GetHealthResponse);
}
