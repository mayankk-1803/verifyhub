const prisma = require('./src/lib/prisma');

async function run() {
  try {
    const services = await prisma.service.findMany();
    console.log('Services in DB:');
    services.forEach(s => {
      console.log(`- ID: ${s.id}, Key: "${s.key}", Name: "${s.name}"`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
