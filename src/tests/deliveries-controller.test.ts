import request from "supertest"
import { app } from "@/app"
import { prisma } from "@/database/prisma"
import { createAuthenticatedUser } from "./utils/create-authenticated-user"

describe("DeliveriesController", () => {
  let createdUserIds: string[] = []

  // Limpeza: Remove registros gerados nos testes
  afterAll(async () => {
    await prisma.delivery.deleteMany({ where: { userId: {in: createdUserIds} } })
    await prisma.user.deleteMany({ where: { id: {in: createdUserIds} } })
  })

  describe("POST /deliveries", () => {
    // Sucesso: Criação de entrega por usuário com permissão de vendedor
    it("should create a delivery successfully when user is a sale", async () => {
      const { userId, token } = await createAuthenticatedUser("sale")
      createdUserIds.push(userId)

      const response = await request(app)
      .post("/deliveries")
      .set("Authorization", `Bearer ${token}`)
      .send({
        user_id: userId,
        description: "Test Description"
      })

      expect(response.status).toBe(201)
    }) 
    
    // Erro: Tentativa de criação de uma entrega sem token de autenticação
    it("should return 401 when token is not provided", async() => {
      const response = await request(app).post("/deliveries").send({
        description: "Test Description"
      })

      expect(response.status).toBe(401)
      expect(response.body.message).toBe("JWT token not found")
    })

    // Erro: Tentativa de criação por usuário sem permissão de acesso
    it("should return 403 when user does not have the sale role", async () => {
        const { userId, token } = await createAuthenticatedUser("customer")
        createdUserIds.push(userId)

        const deliveriesResponse = await request(app).post("/deliveries")
        .set("Authorization", `Bearer ${token}`)
        .send({
          user_id: userId,
          description: "Test Description"
        })

        expect(deliveriesResponse.status).toBe(403)
        expect(deliveriesResponse.body.message).toBe("User does not have permission")
    })
  })

  describe("GET /deliveries", () => {
    // Sucesso: Listagem de entregas para usuário autenticado no sistema
    it("should list deliveries successfully when user is authenticated ", async () => {
      const { userId, token } = await createAuthenticatedUser("sale")
      createdUserIds.push(userId)
      
      await prisma.delivery.create({
        data: {
          userId,
          description: "Existing Delivery for List Test"
        }
      })

      const response = await request(app)
        .get("/deliveries")
        .set("Authorization", `Bearer ${token}`)

      expect(response.status).toBe(200)
      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            description: "Existing Delivery for List Test",
            userId
          })
        ]))
    })
    
    // Erro: Tentativa de listagem sem token de autenticação
    it("it should return 401 when token is not provided", async() => {
      const response = await request(app).get("/deliveries")

      expect(response.status).toBe(401)
      expect(response.body.message).toBe("JWT token not found")
    })
  })
})