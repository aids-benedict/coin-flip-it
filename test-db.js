import sql from './db.js'

async function testConnection() {
  try {
    const result = await sql`SELECT NOW()`
    console.log('✓ Database connected successfully!')
    console.log('Server time:', result[0].now)
    process.exit(0)
  } catch (error) {
    console.error('✗ Database connection failed:')
    console.error(error.message)
    process.exit(1)
  }
}

testConnection()
