const seedDatabase = require('../src/config/seed');
const prisma = require('../src/lib/prisma');

async function main() {
  await seedDatabase();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
