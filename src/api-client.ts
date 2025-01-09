/**
 * Packeta (Zásilkovna) API Client
 * Handles all HTTP communication with the Packeta API
 */

import axios, { AxiosInstance } from 'axios'

export interface PacketaConfig {
  api_key: string
  api_url: string
}

export class PacketaApiClient {
  private client: AxiosInstance
  private config: PacketaConfig

  constructor(config: PacketaConfig) {
    this.config = config
    this.client = axios.create({
      baseURL: config.api_url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.api_key}`
      }
    })
  }

  /**
   * Creates a new shipment in Packeta
   * @param orderData Order data to create shipment from
   * @returns Created shipment data including tracking number
   */
  async createShipment(orderData: Record<string, unknown>): Promise<Record<string, unknown>> {
    try {
      const response = await this.client.post('/shipments', orderData)
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Packeta API Error: ${error.response?.data?.message || error.message}`)
      }
      throw error
    }
  }

  /**
   * Cancels an existing shipment in Packeta
   * @param shipmentId ID of the shipment to cancel
   * @returns Cancellation confirmation data
   */
  async cancelShipment(shipmentId: string): Promise<Record<string, unknown>> {
    try {
      const response = await this.client.delete(`/shipments/${shipmentId}`)
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Packeta API Error: ${error.response?.data?.message || error.message}`)
      }
      throw error
    }
  }

  /**
   * Retrieves a list of pickup points from Packeta
   * @returns Array of pickup points
   */
  async getPickupPoints(): Promise<Record<string, unknown>[]> {
    try {
      const response = await this.client.get('/pickup-points')
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Packeta API Error: ${error.response?.data?.message || error.message}`)
      }
      throw error
    }
  }
}
