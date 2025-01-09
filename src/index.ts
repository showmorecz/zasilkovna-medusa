/**
 * Packeta (Zásilkovna) fulfillment service for MedusaJS
 * Handles creation and cancellation of shipments through Packeta's API
 */

import { 
  FulfillmentService,
} from "@medusajs/medusa/dist/services"
import type {
  Cart,
  Order,
  Fulfillment,
  LineItem,
} from "@medusajs/medusa/dist/models"
import { EntityManager } from "typeorm"
import { PacketaApiClient } from './api-client'

type InjectedDependencies = {
  manager: EntityManager
  fulfillmentRepository: any
}

type Order = {
  id: string
  display_id?: string
  email?: string
  shipping_address?: {
    first_name?: string
    last_name?: string
    phone?: string
  }
  payment_status?: string
  total?: number
}

type LineItem = {
  title?: string
  quantity?: number
}

type Fulfillment = {
  id: string
  metadata?: Record<string, unknown>
}

interface PacketaShipmentData {
  pickup_point_id: string
  recipient: {
    name: string
    email?: string
    phone?: string
  }
  order_number: string
  cod_amount: number
  items: Array<{
    name: string
    quantity: number
  }>
}

class PacketaFulfillmentService extends AbstractFulfillmentService {
  static identifier = 'packeta'
  
  protected readonly manager_: EntityManager
  protected readonly fulfillmentRepository_: any
  protected transactionManager_: EntityManager | undefined
  protected client: PacketaApiClient
  
  protected async withTransaction<T>(
    work: (transactionManager: EntityManager) => Promise<T>
  ): Promise<T> {
    if (this.transactionManager_) {
      return await work(this.transactionManager_)
    }

    const result = await this.manager_.transaction(async (transactionManager: EntityManager) => {
      this.transactionManager_ = transactionManager
      const result = await work(transactionManager)
      this.transactionManager_ = undefined
      return result
    })

    return result
  }

  constructor(container: InjectedDependencies, options: { api_key?: string; api_url?: string } = {}) {
    super(container)
    
    this.manager_ = container.manager
    this.fulfillmentRepository_ = container.fulfillmentRepository

    // Initialize Packeta API client with configuration
    const apiKey = options.api_key || process.env.PACKETA_API_KEY
    const apiUrl = options.api_url || process.env.PACKETA_API_URL

    if (!apiKey || !apiUrl) {
      throw new Error('Packeta API configuration missing. Please provide api_key and api_url in options or set PACKETA_API_KEY and PACKETA_API_URL environment variables.')
    }

    this.client = new PacketaApiClient({
      api_key: apiKey,
      api_url: apiUrl,
    })
  }

  async getFulfillmentOptions(): Promise<any[]> {
    return [{ id: "packeta" }]
  }

  async validateOption(data: Record<string, unknown>): Promise<boolean> {
    return true
  }

  async validateFulfillmentData(
    optionData: Record<string, unknown>,
    data: Record<string, unknown>,
    cart: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    // Validate required fields for Packeta shipment
    if (!data.pickup_point_id) {
      throw new Error('Pickup point ID is required for Packeta shipment')
    }
    return data
  }

  async createFulfillment(
    data: Record<string, unknown>,
    items: LineItem[],
    order: Order,
    fulfillment: Fulfillment
  ): Promise<Record<string, unknown>> {
    try {
      const shipmentData: PacketaShipmentData = {
        pickup_point_id: data.pickup_point_id as string,
        recipient: {
          name: `${order.shipping_address?.first_name || ''} ${order.shipping_address?.last_name || ''}`.trim(),
          email: order.email,
          phone: order.shipping_address?.phone,
        },
        order_number: order.display_id || String(order.id),
        cod_amount: order.payment_status === 'not_paid' ? Number(order.total) : 0,
        items: items.map(item => ({
          name: item.title || '',
          quantity: item.quantity || 1,
        })),
      }

      // Create shipment in Packeta
      const result = await this.client.createShipment(shipmentData)

      // Store tracking number in fulfillment data
      if (result.tracking_number) {
        await this.withTransaction(async (manager) => {
          await this.fulfillmentRepository_.update(
            fulfillment.id,
            {
              tracking_number: String(result.tracking_number),
              metadata: {
                ...(fulfillment.metadata || {}),
                packeta_shipment_id: result.id,
              },
            }
          )
        })
      }

      return result
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Failed to create Packeta shipment: ${error.message}`)
      }
      throw new Error('Failed to create Packeta shipment: Unknown error')
    }
  }

  async cancelFulfillment(
    fulfillment: Fulfillment
  ): Promise<Record<string, unknown>> {
    try {
      const shipmentId = fulfillment.metadata?.packeta_shipment_id as string
      
      if (!shipmentId) {
        throw new Error('No Packeta shipment ID found in fulfillment metadata')
      }

      // Cancel shipment in Packeta
      const result = await this.client.cancelShipment(shipmentId)

      // Update fulfillment status
      await this.withTransaction(async (manager) => {
        await this.fulfillmentRepository_.update(
          fulfillment.id,
          {
            canceled_at: new Date(),
            metadata: {
              ...(fulfillment.metadata || {}),
              cancellation_reason: 'Canceled by merchant',
            },
          }
        )
      })

      return result
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Failed to cancel Packeta shipment: ${error.message}`)
      }
      throw new Error('Failed to cancel Packeta shipment: Unknown error')
    }
  }

  async calculatePrice(
    optionData: Record<string, unknown>,
    data: Record<string, unknown>,
    cart: Record<string, unknown>
  ): Promise<number> {
    // For now, return 0 as price calculation might depend on specific business logic
    return 0
  }
}

export default PacketaFulfillmentService
