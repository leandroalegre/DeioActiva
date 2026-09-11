import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const ROLES = [
  { code: 'super_admin', name: 'Super Administrador' },
  { code: 'admin', name: 'Administrador' },
  { code: 'developer', name: 'Desarrollador' },
  { code: 'tester', name: 'Tester' },
];

async function seedRoles() {
  const roles: Record<string, { id: string }> = {};
  for (const role of ROLES) {
    const saved = await prisma.role.upsert({
      where: { code: role.code },
      update: { name: role.name },
      create: role,
    });
    roles[role.code] = saved;
  }
  return roles;
}

async function seedSuperAdmin(superAdminRoleId: string) {
  const email = process.env.SEED_SUPER_ADMIN_EMAIL ?? 'admin@deioactiva.local';
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD ?? 'ChangeMe123!';
  const fullName = process.env.SEED_SUPER_ADMIN_NAME ?? 'Administrador';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // eslint-disable-next-line no-console
    console.log(`[seed] El usuario ${email} ya existe, no se recrea.`);
    return existing;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      fullName,
      roleId: superAdminRoleId,
      active: true,
    },
  });
  // eslint-disable-next-line no-console
  console.log(`[seed] Usuario super_admin creado: ${email}`);
  return user;
}

async function seedModules() {
  // parentId se resuelve en dos pasadas porque los hijos necesitan el id ya creado del padre.
  const topLevel = [
    { name: 'Alta / Perfil DEO', slug: 'alta-perfil-deo', order: 1 },
    { name: 'Legajos', slug: 'legajos', order: 2 },
    { name: 'Gestión de Comunicación', slug: 'gestion-comunicacion', order: 3 },
    { name: 'Familia G', slug: 'familia-g', order: 4 },
  ];

  const created: Record<string, { id: string }> = {};
  for (const mod of topLevel) {
    const saved = await prisma.module.upsert({
      where: { slug: mod.slug },
      update: { name: mod.name, order: mod.order },
      create: { name: mod.name, slug: mod.slug, order: mod.order },
    });
    created[mod.slug] = saved;
  }

  const children = [
    {
      name: 'Trámites',
      slug: 'gestion-comunicacion-tramites',
      order: 1,
      parentSlug: 'gestion-comunicacion',
    },
    {
      name: 'Comunicación',
      slug: 'gestion-comunicacion-comunicacion',
      order: 2,
      parentSlug: 'gestion-comunicacion',
    },
  ];

  for (const child of children) {
    const parent = created[child.parentSlug];
    await prisma.module.upsert({
      where: { slug: child.slug },
      update: { name: child.name, order: child.order, parentId: parent.id },
      create: {
        name: child.name,
        slug: child.slug,
        order: child.order,
        parentId: parent.id,
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log('[seed] Modulos iniciales creados/actualizados.');
}

async function main() {
  const roles = await seedRoles();
  await seedSuperAdmin(roles['super_admin'].id);
  await seedModules();
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
