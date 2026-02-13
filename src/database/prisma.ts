import { PrismaClient } from "@prisma/client"

export const prisma = new PrismaClient({
  log: (process.env.NODE_ENV === "production" || process.env.NODE_ENV === "test") 
    ? [] 
    : ["query"]
})