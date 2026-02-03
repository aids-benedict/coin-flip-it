import { createClient } from '@supabase/supabase-js'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function migrateUsers() {
  console.log('Starting user migration from NextAuth to Supabase Auth...\n')

  // Fetch all existing users from NextAuth User table using raw SQL
  const existingUsers = await prisma.$queryRaw<Array<{
    id: string;
    email: string;
    name: string | null;
  }>>`
    SELECT id, email, name
    FROM public."User"
  `

  console.log(`Found ${existingUsers.length} user(s) to migrate\n`)

  if (existingUsers.length === 0) {
    console.log('No users to migrate.')
    await prisma.$disconnect()
    return
  }

  const migrationMap: Array<{ oldId: string; newId: string; email: string }> = []

  // Create each user in Supabase Auth
  for (const user of existingUsers) {
    try {
      // Generate a temporary password
      const tempPassword = `TempPass${Math.random().toString(36).slice(-8)}!1Aa`

      console.log(`Migrating user: ${user.email}`)

      // Create user in Supabase Auth with admin API
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: tempPassword,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          name: user.name,
        },
      })

      if (error) {
        console.error(`  ✗ Failed to create user: ${error.message}`)
        throw error
      }

      if (data.user) {
        migrationMap.push({
          oldId: user.id,
          newId: data.user.id,
          email: user.email,
        })

        console.log(`  ✓ Created in Supabase Auth`)
        console.log(`  Temporary password: ${tempPassword}`)

        // Send password reset email
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
          user.email,
          {
            redirectTo: `http://localhost:3000/login`,
          }
        )

        if (resetError) {
          console.error(`  ! Failed to send reset email: ${resetError.message}`)
        } else {
          console.log(`  ✓ Password reset email sent`)
        }

        console.log('') // Empty line for readability
      }
    } catch (error) {
      console.error(`  ✗ Migration failed for ${user.email}:`, error)
      throw error
    }
  }

  // Store migration mappings in database
  console.log('Saving migration mappings...')
  for (const mapping of migrationMap) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO user_migration_map (old_user_id, new_user_id, email)
      VALUES ($1, $2::uuid, $3)
      ON CONFLICT (old_user_id) DO NOTHING
    `, mapping.oldId, mapping.newId, mapping.email)
  }

  console.log('✓ Migration mappings saved\n')

  // Update Decision table with new user IDs
  console.log('Updating Decision records with new user IDs...')
  await prisma.$executeRawUnsafe(`
    UPDATE public."Decision" d
    SET user_id = m.new_user_id
    FROM public.user_migration_map m
    WHERE d."userId" = m.old_user_id
  `)
  console.log('✓ Decision records updated\n')

  console.log('Migration completed successfully!')
  console.log('\nNext steps:')
  console.log('1. Verify all users can log in with password reset link')
  console.log('2. Run: npx tsx scripts/finalize-migration.ts')
  console.log('3. Test the application thoroughly')
  console.log('4. Run cleanup script to remove old tables\n')
}

migrateUsers()
  .then(async () => {
    console.log('Done!')
    await prisma.$disconnect()
    process.exit(0)
  })
  .catch(async (error) => {
    console.error('\n✗ Migration failed:', error)
    await prisma.$disconnect()
    process.exit(1)
  })
