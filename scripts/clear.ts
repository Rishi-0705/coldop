import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()

async function clear() {
  await db.notification.deleteMany({})
  console.log('Wiped notifications.')
}
clear().finally(() => db.$disconnect())
