import { Router } from "express"
import { wrapHandler } from "@medusajs/medusa"
import { getPickupPoints } from "./get-pickup-points"
import { getTracking } from "./get-tracking"

export default (storeRouter: Router) => {
  const packetaRouter = Router()
  storeRouter.use("/packeta", packetaRouter)

  /**
   * List all Packeta pickup points
   * GET /store/packeta/pickup-points
   */
  packetaRouter.get("/pickup-points", wrapHandler(getPickupPoints))

  /**
   * Get tracking information for a shipment
   * GET /store/packeta/tracking/:tracking_number
   */
  packetaRouter.get("/tracking/:tracking_number", wrapHandler(getTracking))

  return storeRouter
}
