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
        const message = error.response?.data?.message || error.message;
        throw new Error(`Packeta API Error: ${message}`);
      }
      throw new Error(`Packeta API Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  /**
   * Retrieves tracking information for a shipment
   * @param trackingNumber - The tracking number of the shipment to track
   * @returns Tracking information including status and history
   */
  async getShipmentTracking(trackingNumber: string): Promise<Record<string, unknown>> {
    try {
      const response = await this.client.get(`/shipments/${trackingNumber}/tracking`)
      return response.data
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Packeta API Error: ${error.response?.data?.message || error.message}`)
      }
      throw error
    }
  }

  /**
   * Retrieves a PDF label for a shipment
   * @param shipmentId - The ID of the shipment to get the label for
   * @returns Base64 encoded PDF label
   */
  async getShipmentLabel(shipmentId: string): Promise<string> {
    try {
      const response = await this.client.get(`/shipments/${shipmentId}/label`)
      return response.data.label
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Packeta API Error: ${error.response?.data?.message || error.message}`)
      }
      throw error
    }
  }

  /**
   * Retrieves PDF labels for multiple shipments
   * @param shipmentIds - Array of shipment IDs to get labels for
   * @returns Base64 encoded PDF containing all labels
   */
  async getBulkShipmentLabels(shipmentIds: string[]): Promise<string> {
    try {
      const response = await this.client.post('/shipments/labels', { ids: shipmentIds })
      return response.data.labels
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Packeta API Error: ${error.response?.data?.message || error.message}`)
      }
      throw error
    }
  }

  /**
   * Retrieves a ZPL format label for a shipment
   * @param shipmentId - The ID of the shipment to get the label for
   * @returns ZPL format label (requires XML unescaping)
   */
  async getShipmentLabelZpl(shipmentId: string): Promise<string> {
    try {
      const response = await this.client.get(`/shipments/${shipmentId}/label/zpl`)
      return response.data.label
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Packeta API Error: ${error.response?.data?.message || error.message}`)
      }
      throw error
    }
  }
}
