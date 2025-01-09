import { Request, Response } from "express"
import PacketaFulfillmentService from "../../../../index"

/**
 * @api {get} /store/packeta/tracking/:tracking_number Get Shipment Tracking
 * @apiDescription Retrieves tracking information for a Packeta shipment
 * @apiName GetTracking
 * @apiGroup Packeta
 * @apiParam {String} tracking_number Tracking number of the shipment
 * @apiSuccess {Object} tracking Tracking information for the shipment
 */
export async function getTracking(
  req: Request,
  res: Response
): Promise<void> {
  const { tracking_number } = req.params

  if (!tracking_number) {
    res.status(400).json({ message: "Tracking number is required" })
    return
  }

  try {
    const packetaService: PacketaFulfillmentService = req.scope.resolve("packetaFulfillmentService")
    const trackingInfo = await packetaService.trackShipment(tracking_number)
    res.json({ tracking: trackingInfo })
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: `Error fetching tracking info: ${error.message}` })
    } else {
      res.status(500).json({ message: "An unknown error occurred" })
    }
  }
}
