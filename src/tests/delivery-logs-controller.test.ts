import request from "supertest"
import { app } from "@/app"
import { createAuthenticatedUser } from "./utils/create-authenticated-user"
import { prisma } from "@/database/prisma"

describe("DeliveryLogsController", () => {
  let saleToken: string
  let customerToken: string
  let customerDeliveryId: string
  let createdUserIds: string[] = []
  
  // Prepara o cenário com usuários sale e customer com uma entrega vinculada ao cliente
  beforeAll(async () => {
    const { userId: saleId, token: saleUserToken } = await createAuthenticatedUser("sale")
    const { userId: customerId, token: customerUserToken } = await createAuthenticatedUser("customer")
    
    saleToken = saleUserToken 
    customerToken = customerUserToken 
    createdUserIds = [saleId, customerId]

    const delivery = await prisma.delivery.create({
      data: {
        userId: customerId,
        description: "Test delivery logs",
        status: "shipped"
      },
    })

    customerDeliveryId = delivery.id
  })

  // Limpeza: Remove registros gerados nos teste
  afterAll(async () => {
    await prisma.deliveryLog.deleteMany({
      where: { delivery: { userId: { in: createdUserIds } } }
    })
    await prisma.delivery.deleteMany({
      where: { userId: { in: createdUserIds } }
    })
    await prisma.user.deleteMany({
      where: { id: { in: createdUserIds } }
    })
  })

  describe("POST /delivery-logs", () => {
    // Sucesso: Registro de log em entrega com status 'shipped'
    it("should create a delivery log successfully", async () => {
      const response = await request(app)
        .post("/delivery-logs")
        .set("Authorization", `Bearer ${saleToken}`)
        .send({
          delivery_id: customerDeliveryId,
          description: "Delivery logs test"
        })
        
      expect(response.status).toBe(201)
    })

    // Erro: Tentativa de log em entrega já finalizada
    it("should return 400 when delivery status is 'delivered'", async () => {
      await prisma.delivery.update({
        where: { id: customerDeliveryId },
        data: { status: "delivered" }
      })

      const response = await request(app)
        .post("/delivery-logs")
        .set("Authorization", `Bearer ${saleToken}`)
        .send({ 
          delivery_id: customerDeliveryId,
          description: "Late log test" 
        })

      expect(response.status).toBe(400)
      expect(response.body.message).toBe("this order has already been delivered")
    })

    // Erro: Tentativa de log em entrega ainda em processamento
    it("should return 400 when delivery status is 'processing'", async () => {
      await prisma.delivery.update({
        where: { id: customerDeliveryId },
        data: { status: "processing" }
      })

      const response = await request(app)
        .post("/delivery-logs")
        .set("Authorization", `Bearer ${saleToken}`)
        .send({ 
          delivery_id: customerDeliveryId, 
          description: "Early log test" 
        })

      expect(response.status).toBe(400)
      expect(response.body.message).toBe("change status to shipped")
    })

    // Erro: Tentativa de log para ID de entrega inexistente
    it("should return 404 when delivery does not exist", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000"

      const response = await request(app)
        .post("/delivery-logs")
        .set("Authorization", `Bearer ${saleToken}`)
        .send({ 
          delivery_id: fakeId, 
          description: "No delivery" 
        })

      expect(response.status).toBe(404)
      expect(response.body.message).toBe("delivery not found")
    })

    // Erro: Validação de campos obrigatórios e formato (Zod)
    it("should return 400 for invalid body data", async () => {
      const response = await request(app)
        .post("/delivery-logs")
        .set("Authorization", `Bearer ${saleToken}`)
        .send({ delivery_id: "invalid-uuid", description: "" })

      expect(response.status).toBe(400)
      expect(response.body.message).toBe("validation error")
    })
  })

  describe("GET /delivery-logs/:delivery_id/show", () => {
    // Sucesso: Listagem dos detalhes da entrega pelo perfil vendedor
    it("should allow a sale user to view any delivery", async () => {
      const response = await request(app)
        .get(`/delivery-logs/${customerDeliveryId}/show`)
        .set("Authorization", `Bearer ${saleToken}`)

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty("user")
    })

    // Sucesso: Listagem dos detalhes da entrega que pertencem ao cliente que solicitou
    it("should allow the customer to view their own delivery", async () => {
      const response = await request(app)
        .get(`/delivery-logs/${customerDeliveryId}/show`)
        .set("Authorization", `Bearer ${customerToken}`)

      expect(response.status).toBe(200)
      expect(response.body.id).toBe(customerDeliveryId)
    })

    // Erro: Bloqueio de acesso para cliente não proprietário da entrega
    it("should block a customer from viewing a delivery that is not theirs", async () => {
      const { userId: strangerId, token: otherCustomerToken } = await createAuthenticatedUser("customer")
      createdUserIds.push(strangerId)

      const response = await request(app)
        .get(`/delivery-logs/${customerDeliveryId}/show`)
        .set("Authorization", `Bearer ${otherCustomerToken}`)

      expect(response.status).toBe(401)
      expect(response.body.message).toBe("the user can only view their deliveries")
    })
    
    // Erro: Consulta de ID de entrega inexistente no sistema
    it("should return 404 when delivery does not exist", async () => {
      const response = await request(app)
        .get(`/delivery-logs/00000000-0000-0000-0000-000000000000/show`)
        .set("Authorization", `Bearer ${saleToken}`)

      expect(response.status).toBe(404)
      expect(response.body.message).toBe("delivery not found")
    })
  })
})