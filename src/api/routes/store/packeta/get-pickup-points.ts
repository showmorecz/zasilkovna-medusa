import { Request, Response } from "express"
import PacketaFulfillmentService from "../../../../index"

/**
 * @api {get} /store/packeta/pickup-points List Packeta Pickup Points
 * @apiDescription Gets a list of all available Packeta pickup points
 * @apiName GetPickupPoints
 * @apiGroup Packeta
 * @apiSuccess {Object[]} pickup_points List of pickup points
 */
export async function getPickupPoints(
  req: Request,
  res: Response
): Promise<void> {
  const packetaService: PacketaFulfillmentService = req.scope.resolve("packetaFulfillmentService")

  try {
    const pickupPoints = await packetaService.getPickupPoints()
    res.json({ pickup_points: pickupPoints })
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ message: `Error fetching pickup points: ${error.message}` })
    } else {
      res.status(500).json({ message: "An unknown error occurred" })
    }
  }
}
