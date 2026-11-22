import '@tanstack/react-start/server-only'
import { StoreHealthResponse, storeRoutes } from '@bbferm/store-schema'
import { storeClient } from './client'

export interface IGetHealthRequest {}

export type GetHealthResponse = {
  status: 'serving' | 'not_serving'
  version: string
  time: string
}

export async function getHealth(request: IGetHealthRequest) {
  const response: GetHealthResponse = await storeClient().get(storeRoutes.health, StoreHealthResponse)
  return response
}
