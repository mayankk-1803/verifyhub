const prisma = require('./src/lib/prisma');

async function run() {
  try {
    const users = await prisma.user.findMany({
      include: {
        role: true,
        wallet: true
      }
    });
    console.log('Users in DB:');
    users.forEach(u => {
      console.log(`- ID: ${u.id}, Email: ${u.email}, Role: ${u.role ? u.role.name : 'none'}, Wallet ID: ${u.wallet ? u.wallet.id : 'none'}, Wallet Balance: ${u.wallet ? u.wallet.balance : 'none'}`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
