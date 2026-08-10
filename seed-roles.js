const { PrismaClient } = require('@prisma/client-identity');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Roles...');
  await prisma.role.createMany({
    data: [
      { name: 'CUSTOMER', description: 'Khách hàng' },
      { name: 'PROVIDER', description: 'Nhà cung cấp' },
      { name: 'ADMIN', description: 'Quản trị viên' }
    ],
    skipDuplicates: true,
  });
  console.log('✅ Roles seeded successfully!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
