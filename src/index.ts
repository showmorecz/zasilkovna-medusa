/**
 * Packeta (Zásilkovna) fulfillment service for MedusaJS
 * Handles creation and cancellation of shipments through Packeta's API
 */

import { 
  AbstractFulfillmentService,
  type Cart,
  type Order,
  type LineItem,
  type Fulfillment,
  type ShippingMethod,
} from "@medusajs/medusa"
import type { EntityManager } from "typeorm"
import { PacketaApiClient } from "./api-client"

// Type definitions for Medusa interfaces
type ShippingOptionData = {
  id: string
  profile_id: string
  data: Record<string, unknown>
}

type FulfillmentProviderData = Record<string, unknown>

type ShippingMethodData = {
  shipping_option: ShippingOptionData
  data: Record<string, unknown>
}

type CreateReturnType = {
  order: Order
  shipping_method: ShippingMethod
  shipping_data?: Record<string, unknown>
  items: LineItem[]
}

// Custom type for Packeta API request
interface PacketaShipmentData {
  pickup_point_id: string
  recipient: {
    name: string
    email?: string
    phone?: string | null
  }
  order_number: string | number
  cod_amount: number
  items: Array<{
    name: string
    quantity: number
  }>
}
/**
 * Type definitions for internal use
 */
interface CreateFulfillmentInput {
  order: Order
  items: LineItem[]
  metadata?: Record<string, unknown>
  fulfillment: Fulfillment
}

interface InjectedDependencies {
  manager: EntityManager
  fulfillmentRepository: any
}

interface PacketaShipmentData extends Record<string, unknown> {
  pickup_point_id: string
  recipient: {
    name: string
    email?: string
    phone?: string | null
  }
  order_number: string | number
  cod_amount: number
  items: Array<{
    name: string
    quantity: number
  }>
}

// Already moved imports and interfaces to the top

class PacketaFulfillmentService extends AbstractFulfillmentService {
  static identifier = 'packeta'
  
  protected readonly manager_: EntityManager
  protected readonly fulfillmentRepository_: any
  protected transactionManager_: EntityManager | undefined
  protected client: PacketaApiClient

  getIdentifier(): string {
    return PacketaFulfillmentService.identifier
  }
  
  // Transaction handling is inherited from TransactionBaseService

  constructor(
    container: { 
      manager: EntityManager; 
      fulfillmentRepository: any;
      [key: string]: unknown;
    }, 
    options: { api_key?: string; api_url?: string } = {}
  ) {
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

  async getFulfillmentOptions(): Promise<{ id: string; name?: string; }[]> {
    return [{ 
      id: "packeta",
      name: "Packeta (Zásilkovna)"
    }]
  }

  async canCalculate(data: ShippingOptionData): Promise<boolean> {
    return true
  }

  async validateOption(data: ShippingOptionData): Promise<boolean> {
    return true
  }

  /**
   * Validates the fulfillment data before creating a shipment
   * @param optionData - The selected shipping option data
   * @param data - The fulfillment data including pickup point
   * @param cart - The cart containing shipping information
   * @returns Validated fulfillment data
   */
  async validateFulfillmentData(
    optionData: ShippingOptionData,
    data: FulfillmentProviderData,
    cart: Cart
  ): Promise<Record<string, unknown>> {
    // Validate required fields for Packeta shipment
    if (!data.pickup_point_id) {
      throw new Error('Pickup point ID is required for Packeta shipment')
    }

    // Validate recipient information from cart
    const shippingAddress = cart.shipping_address
    if (!shippingAddress?.first_name || !shippingAddress?.last_name) {
      throw new Error('Recipient name is required for Packeta shipment')
    }

    if (!cart.email) {
      throw new Error('Recipient email is required for Packeta shipment')
    }

    if (!shippingAddress?.phone) {
      throw new Error('Recipient phone number is required for Packeta shipment')
    }

    return {
      ...data,
      validated: true,
      recipient_name: `${shippingAddress.first_name} ${shippingAddress.last_name}`,
      recipient_email: cart.email,
      recipient_phone: shippingAddress.phone,
    }
  }

  async createFulfillment(
    data: ShippingMethodData,
    items: LineItem[],
    order: Order,
    fulfillment: Fulfillment
  ): Promise<FulfillmentProviderData> {
    try {
      const shipmentData: PacketaShipmentData = {
        pickup_point_id: data.data.pickup_point_id as string,
        recipient: {
          name: `${order.shipping_address?.first_name || ''} ${order.shipping_address?.last_name || ''}`.trim(),
          email: order.email,
          phone: order.shipping_address?.phone || null,
        },
        order_number: order.display_id || order.id,
        cod_amount: order.payment_status === 'not_paid' ? Number(order.total) : 0,
        items: items.map((item: LineItem) => ({
          name: String(item.title || ''),
          quantity: Number(item.quantity || 1),
        })),
      }

      // Create shipment in Packeta
      const result = await this.client.createShipment(shipmentData)

      // Store tracking number in fulfillment data
      if (result.tracking_number) {
        await this.atomicPhase_(async (transactionManager: EntityManager) => {
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
    fulfillmentData: FulfillmentProviderData
  ): Promise<Record<string, unknown>> {
    const fulfillment = fulfillmentData as unknown as Fulfillment
    try {
      const shipmentId = fulfillment.metadata?.packeta_shipment_id as string
      
      if (!shipmentId) {
        throw new Error('No Packeta shipment ID found in fulfillment metadata')
      }

      // Cancel shipment in Packeta
      const result = await this.client.cancelShipment(shipmentId)

      // Update fulfillment status
      await this.atomicPhase_(async (transactionManager: EntityManager) => {
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

  /**
   * Calculates the price for the fulfillment option
   * @param optionData - The selected shipping option data
   * @param data - The fulfillment data
   * @param cart - The cart containing items and shipping information
   * @returns Calculated price for the shipping
   */
  async calculatePrice(
    optionData: Record<string, unknown>,
    data: Record<string, unknown>,
    cart: Cart
  ): Promise<number> {
    // Price calculation can be implemented based on business requirements
    // For now, returning 0 as price might be configured in the shipping options
    return 0
  }

  async createReturn(
    returnOrder: {
      order: Order;
      shipping_method: ShippingMethod;
      shipping_data: Record<string, unknown>;
      items: LineItem[];
    }
  ): Promise<FulfillmentProviderData> {
    // Basic implementation for returns
    // Can be enhanced later with actual return label generation
    // You could implement return label creation via Packeta API here
    return {
      tracking_number: null,
      shipping_data: returnOrder.shipping_data || {},
    }
  }

  async getFulfillmentDocuments(
    data: Record<string, unknown>
  ): Promise<any> {
    // Can be implemented later to fetch shipping labels or other documents
    return {}
  }

  async getReturnDocuments(
    data: Record<string, unknown>
  ): Promise<any> {
    // Can be implemented later to fetch return labels
    return {}
  }

  async getShipmentDocuments(
    data: Record<string, unknown>
  ): Promise<any> {
    // Can be implemented later to fetch shipment documents
    return {}
  }

  async retrieveDocuments(
    fulfillmentData: Record<string, unknown>,
    documentType: "invoice" | "label"
  ): Promise<any> {
    // Can be implemented later to fetch specific document types
    return {}
  }

  /**
   * Gets a list of all available Packeta pickup points
   * This is an additional method not required by the FulfillmentService interface
   * but useful for the pickup points endpoint
   * @returns Array of pickup points with their details
   */
  async getPickupPoints(): Promise<Record<string, unknown>[]> {
    try {
      return await this.client.getPickupPoints()
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch Packeta pickup points: ${error.message}`)
      }
      throw new Error('Failed to fetch Packeta pickup points: Unknown error')
    }
  }
}

export default PacketaFulfillmentService
