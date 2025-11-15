-- Create table to track automated backups
CREATE TABLE IF NOT EXISTS public.automated_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  company_id UUID,
  backup_type TEXT NOT NULL CHECK (backup_type IN ('manual', 'automated', 'scheduled')),
  backup_size BIGINT,
  tables_included TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.automated_backups ENABLE ROW LEVEL SECURITY;

-- Users can view their own backups or their company backups
CREATE POLICY "Users can view their backups"
  ON public.automated_backups
  FOR SELECT
  USING (
    (company_id IS NULL AND user_id = auth.uid()) 
    OR 
    (company_id = get_user_company_id(auth.uid()))
  );

-- Users can create their own backups
CREATE POLICY "Users can create backups"
  ON public.automated_backups
  FOR INSERT
  WITH CHECK (
    (company_id IS NULL AND user_id = auth.uid()) 
    OR 
    (company_id = get_user_company_id(auth.uid()))
  );

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_automated_backups_user_id ON public.automated_backups(user_id);
CREATE INDEX IF NOT EXISTS idx_automated_backups_company_id ON public.automated_backups(company_id);
CREATE INDEX IF NOT EXISTS idx_automated_backups_created_at ON public.automated_backups(created_at DESC);