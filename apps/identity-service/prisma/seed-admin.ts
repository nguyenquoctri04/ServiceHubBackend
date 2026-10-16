/**
 * Seed script: tạo tài khoản admin mặc định cho hệ thống ServiceHub.
 * Chạy: npx tsx apps/identity-service/prisma/seed-admin.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client-identity';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const ADMIN_EMAIL    = 'admin@servicehub.com';
const ADMIN_PASSWORD = '88888888';
const ADMIN_PHONE    = '0900000000';

async function main() {
  // 1. Ensure ADMIN role exists
  let adminRole = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
  if (!adminRole) {
    adminRole = await prisma.role.create({
      data: {
        name:      'ADMIN',
        description: 'Quản trị viên hệ thống',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    console.log('✅ Created role: ADMIN');
  } else {
    console.log('ℹ️  Role ADMIN already exists');
  }

  // 2. Check if admin account already exists
  const existing = await prisma.identity.findUnique({ where: { email: ADMIN_EMAIL } });
  if (existing) {
    console.log(`ℹ️  Admin account already exists: ${ADMIN_EMAIL}`);
    return;
  }

  // 3. Hash password
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  // 4. Create admin identity
  const admin = await prisma.identity.create({
    data: {
      email:        ADMIN_EMAIL,
      phone:        ADMIN_PHONE,
      passwordHash,
      roleId:       adminRole.id,
      status:       'ACTIVE',
      isEkycVerified: false,
      createdAt:    new Date(),
      updatedAt:    new Date(),
    },
  });

  console.log(`✅ Admin account created:`);
  console.log(`   ID:       ${admin.id}`);
  console.log(`   Email:    ${admin.email}`);
  console.log(`   Role:     ADMIN`);
  console.log(`   Password: ${ADMIN_PASSWORD}  ← change after first login!`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
