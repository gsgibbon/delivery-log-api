import request from "supertest"
import { app } from "@/app" 
import { prisma } from "@/database/prisma"

describe("UsersController", () => {
  let userId: string 

  // Limpeza: Remove registros gerados nos testes
  afterAll(async () => {
    await prisma.user.delete({ where: { id: userId } })
  }) 

  // Sucesso: Cadastro de registro confirmando criação de novo usuário
  it("should create a new user successfully", async () => {
    const response = await request(app).post("/users").send({
      name: "Test User",
      email: "test@example.com",
      password: "123456"
    })

    expect(response.status).toBe(201) 
    expect(response.body).toHaveProperty("id")
    expect(response.body.name).toBe("Test User")

    userId = response.body.id
  })

  // Erro: Tentativa de cadastro com e-mail já existente
  it("should throw an error if user with same email already exists", async () => {
    const response = await request(app).post("/users").send({
      name: "Duplicate User",
      email: "test@example.com",
      password: "123456"
    })

    expect(response.status).toBe(400)
    expect(response.body.message).toBe("User with same e-mail already exists")
  })
  
  // Erro: Tentativa de cadastro com e-mail em formato inválido
  it("should throw a validation error if email is invalid", async () => {
    const response = await request(app).post("/users").send({
      name: "Test User",
      email: "invalid-email",
      password: "123456"
    })

    expect(response.status).toBe(400)
    expect(response.body.message).toBe("validation error")
  })
})