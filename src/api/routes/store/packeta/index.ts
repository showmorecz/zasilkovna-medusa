import { Router } from "express"
import { wrapHandler } from "@medusajs/medusa"
import { getPickupPoints } from "./get-pickup-points"

const router = Router()

export default (storeRouter: Router) => {
  const packetaRouter = Router()
  storeRouter.use("/packeta", packetaRouter)

  /**
   * List all Packeta pickup points
   * GET /store/packeta/pickup-points
   */
  packetaRouter.get("/pickup-points", wrapHandler(getPickupPoints))

  return storeRouter
}
