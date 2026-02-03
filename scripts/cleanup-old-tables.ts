import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function cleanupOldTables() {
  console.log('Starting cleanup of old NextAuth tables...\n')

  try {
    // Drop old NextAuth tables
    console.log('Dropping old tables...')

    await prisma.$executeRawUnsafe(`
      DROP TABLE IF EXISTS public."Account" CASCADE;
    `)
    console.log('✓ Dropped Account table')

    await prisma.$executeRawUnsafe(`
      DROP TABLE IF EXISTS public."Session" CASCADE;
    `)
    console.log('✓ Dropped Session table')

    await prisma.$executeRawUnsafe(`
      DROP TABLE IF EXISTS public."VerificationToken" CASCADE;
    `)
    console.log('✓ Dropped VerificationToken table')

    await prisma.$executeRawUnsafe(`
      DROP TABLE IF EXISTS public."User" CASCADE;
    `)
    console.log('✓ Dropped User table')

    await prisma.$executeRawUnsafe(`
      DROP TABLE IF EXISTS public.user_migration_map CASCADE;
    `)
    console.log('✓ Dropped user_migration_map table')

    console.log('\n✅ Cleanup completed successfully!')
    console.log('All old NextAuth tables have been removed.\n')

  } catch (error) {
    console.error('\n❌ Cleanup failed:', error)
    throw error
  }
}

cleanupOldTables()
  .then(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
  .catch(async (error) => {
    await prisma.$disconnect()
    process.exit(1)
  })
