import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function optimizePerformance() {
  console.log('Starting performance optimizations...\n')

  try {
    // 1. Add index on userId foreign key
    console.log('Adding index on userId column...')
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_decision_user_id ON public."Decision"("userId");
    `)
    console.log('✓ Added index on userId\n')

    // 2. Optimize RLS policies to use subselects
    console.log('Optimizing RLS policies...')

    // Drop existing policies
    await prisma.$executeRawUnsafe(`
      DROP POLICY IF EXISTS "Users can view own decisions" ON public."Decision";
    `)
    await prisma.$executeRawUnsafe(`
      DROP POLICY IF EXISTS "Users can insert own decisions" ON public."Decision";
    `)
    await prisma.$executeRawUnsafe(`
      DROP POLICY IF EXISTS "Users can update own decisions" ON public."Decision";
    `)
    await prisma.$executeRawUnsafe(`
      DROP POLICY IF EXISTS "Users can delete own decisions" ON public."Decision";
    `)
    console.log('✓ Dropped old policies')

    // Create optimized policies with subselects
    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Users can view own decisions"
      ON public."Decision"
      FOR SELECT
      TO authenticated
      USING ((select auth.uid()) = "userId"::uuid);
    `)
    console.log('✓ Created optimized SELECT policy')

    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Users can insert own decisions"
      ON public."Decision"
      FOR INSERT
      TO authenticated
      WITH CHECK ((select auth.uid()) = "userId"::uuid);
    `)
    console.log('✓ Created optimized INSERT policy')

    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Users can update own decisions"
      ON public."Decision"
      FOR UPDATE
      TO authenticated
      USING ((select auth.uid()) = "userId"::uuid)
      WITH CHECK ((select auth.uid()) = "userId"::uuid);
    `)
    console.log('✓ Created optimized UPDATE policy')

    await prisma.$executeRawUnsafe(`
      CREATE POLICY "Users can delete own decisions"
      ON public."Decision"
      FOR DELETE
      TO authenticated
      USING ((select auth.uid()) = "userId"::uuid);
    `)
    console.log('✓ Created optimized DELETE policy')

    console.log('\n✅ Performance optimizations completed!')
    console.log('- Added index on userId foreign key')
    console.log('- Optimized RLS policies with subselects\n')

  } catch (error) {
    console.error('\n❌ Optimization failed:', error)
    throw error
  }
}

optimizePerformance()
  .then(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
  .catch(async (error) => {
    await prisma.$disconnect()
    process.exit(1)
  })
