import { Request, Response } from "express"
import { prisma } from "@/database/prisma"
import { z } from "zod"
import { AppError } from "@/utils/AppError"

class DeliveriesStatusController {
  async update(request: Request, response: Response) {
    const paramsSchema = z.object({
      id: z.string().uuid(),
    }) 
    const bodySchema = z.object({
      status: z.enum(["shipped", "delivered"])
    }) 
    
    const { id } = paramsSchema.parse(request.params)
    const { status } = bodySchema.parse(request.body)

    const delivery = await prisma.delivery.findUnique({
      where: { id }
    })

    if (!delivery) {
      throw new AppError("Delivery not found", 404)
    }

    const updatedDelivery = await prisma.delivery.update({
      data: { status }, 
      where: { id }
    })

    const log = await prisma.deliveryLog.create({
      data: {
        deliveryId: id,
        description: status
      }
    })

    return response.json({
      delivery: {
        status: updatedDelivery.status
      },
      log: {
        id: log.id,
        description: log.description,
        created_at: log.createdAt,
      }
    })
  }

}
export { DeliveriesStatusController }