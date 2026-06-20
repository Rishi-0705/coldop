const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function reset() { 
  await prisma.savingsCounter.update({ 
    where: { id: 1 }, 
    data: { tonightRM: 0, thisWeekRM: 0, thisMonthRM: 0, co2Tonnes: 0, ghostLoadHours: 0 } 
  }); 
  console.log('Reset savings'); 
}
reset().catch(console.error).finally(() => prisma.$disconnect());
