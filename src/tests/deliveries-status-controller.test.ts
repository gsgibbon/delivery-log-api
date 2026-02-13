import request from "supertest"
import { createAuthenticatedUser } from "./utils/create-authenticated-user"
import { app } from "@/app"
import { prisma } from "@/database/prisma"

describe("DeliveriesStatusController", () => {
  let createdUserIds: string[] = []
  let createdDeliveryIds: string[] = []

  // Limpeza: Remove registros gerados nos testes
  afterAll(async () => {
    await prisma.deliveryLog.deleteMany({ 
      where: { deliveryId: {in: createdDeliveryIds} } 
    })
    await prisma.delivery.deleteMany({ 
      where: { id: {in: createdDeliveryIds} } 
    })
    await prisma.user.deleteMany({ 
      where: { id: {in: createdUserIds} } 
    })
  })

  // Sucesso: Atualização de status da entrega com criação de log correspondente
  it.each(["shipped", "delivered"])("should update status to %s and return log data", async (status) => {
      const { userId, token } = await createAuthenticatedUser("sale")
      createdUserIds.push(userId)

      const deliveryResponse = await request(app)
        .post("/deliveries")
        .set("Authorization", `Bearer ${token}`)
        .send({
          user_id: userId,
          description: "Test deliveries status"
        })
      
      const deliveryId = deliveryResponse.body.id
      createdDeliveryIds.push(deliveryId)

      const deliveryStatusResponse = await request(app)
        .patch(`/deliveries/${deliveryId}/status`)
        .set("Authorization", `Bearer ${token}`)
        .send({ status })

      expect(deliveryStatusResponse.status).toBe(200)
      expect(deliveryStatusResponse.body).toEqual({
        delivery: { status },
        log: {
          id: expect.any(String),
          description: status,
          created_at: expect.any(String)
        }
      })
  })

  // Erro: Tentativa de atualização com status inválido
  it("should return 400 when status is invalid", async () => {
    const { userId, token } = await createAuthenticatedUser("sale")
    createdUserIds.push(userId)
    
    const fakeValidId = "00000000-0000-0000-0000-000000000000"

    const response = await request(app)
      .patch(`/deliveries/${fakeValidId}/status`) 
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "invalid-status"})

    expect(response.status).toBe(400)
    expect(response.body.message).toBe("validation error")
    expect(response.body).toHaveProperty("issues")  
  })

  // Erro: Tentativa de atualização com ID em formato inválido
  it("should return 400 when delivery id is not a valid UUID", async () => {
    const { userId, token } = await createAuthenticatedUser("sale")
    createdUserIds.push(userId)

    const response = await request(app)
      .patch("/deliveries/123/status")
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "shipped" })

    expect(response.status).toBe(400)
    expect(response.body.message).toBe("validation error")
  })

  // Erro: Tentativa de atualização com ID em formato válido mas inexistente no banco
  it("should return 404 when delivery id does not exist", async () => {
    const { userId, token } = await createAuthenticatedUser("sale")
    createdUserIds.push(userId)

    const unknownId = "00000000-0000-0000-0000-000000000000"

    const response = await request(app)
      .patch(`/deliveries/${unknownId}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "shipped" })

    expect(response.status).toBe(404)
    expect(response.body.message).toBe("Delivery not found")
  })
})