-- Migration: NextAuth to Supabase Auth
-- This migration updates the Decision table to reference Supabase's auth.users

-- Step 1: Add new user_id column (UUID type for auth.users)
ALTER TABLE public."Decision" ADD COLUMN user_id UUID;

-- Step 2: Create mapping table for user migration
CREATE TABLE IF NOT EXISTS public.user_migration_map (
  old_user_id TEXT PRIMARY KEY,
  new_user_id UUID NOT NULL,
  email TEXT NOT NULL,
  migrated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Update Decision records with new user IDs
-- (This will be done after running the user migration script)
-- UPDATE public."Decision" d
-- SET user_id = m.new_user_id
-- FROM public.user_migration_map m
-- WHERE d."userId" = m.old_user_id;

-- Step 4: Add foreign key constraint to auth.users
-- (Run this AFTER updating all Decision records)
-- ALTER TABLE public."Decision"
-- ADD CONSTRAINT decision_user_id_fkey
-- FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 5: Drop old foreign key and userId column
-- (Run this AFTER verifying all data is migrated correctly)
-- ALTER TABLE public."Decision" DROP CONSTRAINT "Decision_userId_fkey";
-- ALTER TABLE public."Decision" DROP COLUMN "userId";

-- Step 6: Rename user_id to userId for consistency
-- (Run this AFTER step 5)
-- ALTER TABLE public."Decision" RENAME COLUMN user_id TO "userId";

-- Step 7: Drop NextAuth tables
-- (Run this AFTER all verification is complete)
-- DROP TABLE IF EXISTS public."Account" CASCADE;
-- DROP TABLE IF EXISTS public."Session" CASCADE;
-- DROP TABLE IF EXISTS public."VerificationToken" CASCADE;
-- DROP TABLE IF EXISTS public."User" CASCADE;
-- DROP TABLE IF EXISTS public.user_migration_map CASCADE;
