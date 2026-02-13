import request from "supertest"

import { app } from "@/app"
import { prisma } from "@/database/prisma"

export async function createAuthenticatedUser(role: "customer" | "sale") {
  const email = `test_${role}_${Date.now()}@example.com`
  const password = "test_password_123"

  const userResponse = await request(app).post("/users").send({
    name: `Test User ${role}`,
    email,
    password
  })

  const userId = userResponse.body.id

  if (role === "sale") {
    await prisma.user.update({
      where: { id: userId },
      data: { role: "sale" }
    })
  }

  const sessionResponse = await request(app).post("/sessions").send({
    email,
    password
  })

  return { userId, token: sessionResponse.body.token }
}