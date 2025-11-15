// Helper to work around empty Supabase types
import { supabase as supabaseClient } from "@/integrations/supabase/client";

// Create a wrapper that bypasses TypeScript checking for database operations
export const supabase = supabaseClient as any;
