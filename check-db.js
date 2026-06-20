const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const rooms = await prisma.coldRoom.findMany();
  console.log(rooms.map(r => ({
    code: r.code, 
    temp: r.targetTemp, 
    recommended: r.recommendedSetpoint,
    reason: r.aiReason
  })));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
