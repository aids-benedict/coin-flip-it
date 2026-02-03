-- Enable Row Level Security (RLS) on Decision table
-- This ensures users can only access their own decisions

-- Enable RLS
ALTER TABLE public."Decision" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own decisions
CREATE POLICY "Users can view own decisions"
ON public."Decision"
FOR SELECT
TO authenticated
USING (auth.uid() = "userId"::uuid);

-- Policy: Users can insert their own decisions
CREATE POLICY "Users can insert own decisions"
ON public."Decision"
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = "userId"::uuid);

-- Policy: Users can update their own decisions
CREATE POLICY "Users can update own decisions"
ON public."Decision"
FOR UPDATE
TO authenticated
USING (auth.uid() = "userId"::uuid)
WITH CHECK (auth.uid() = "userId"::uuid);

-- Policy: Users can delete their own decisions
CREATE POLICY "Users can delete own decisions"
ON public."Decision"
FOR DELETE
TO authenticated
USING (auth.uid() = "userId"::uuid);
