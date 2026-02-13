import request from "supertest"
import { app } from "@/app"
import { prisma } from "@/database/prisma"

describe("SessionsController", () => {
  const email = `auth_test_user${Date.now()}@example.com`
  const password = "test_password123"

  // Limpeza: Remove registros gerados nos testes
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } })
  })

  // Sucesso: Autenticação de usuário com geração de token de acesso
  it("should authenticate a and get access token", async () => {
    await request(app).post("/users").send({
      name: "Auth Test Name",
      email,
      password
    })

    const response = await request(app).post("/sessions").send({
      email,
      password
    }) 

    expect(response.status).toBe(200)
    expect(response.body.token).toEqual(expect.any(String)) 
  })

  // Erro: Tentativa de login com e-mail não cadastrado
  it("should return 401 when the user is not registered", async () => {
    const response = await request(app).post("/sessions").send({
      email: "invalid-email@example.com",
      password
    })

    expect(response.status).toBe(401)
    expect(response.body.message).toBe("Invalid e-mail or password")
  })

  // Erro: Tentativa de login com senha incorreta
  it("should return 401 when the password is incorrect", async () => {
    const response = await request(app).post("/sessions").send({
      email,
      password: "invalid-password"
    })

    expect(response.status).toBe(401)
    expect(response.body.message).toBe("Invalid e-mail or password")
  })
})
