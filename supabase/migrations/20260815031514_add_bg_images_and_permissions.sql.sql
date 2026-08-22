/*
# Add background image URLs and user permissions

1. Purpose
   - Adds two background image URL columns to farm_profile for dynamic
     login and dashboard background customization.
   - Adds a JSONB permissions column to staff_users for granular
     per-module view/edit access control (RBAC).

2. Schema changes
   - farm_profile: + login_bg_url (text, nullable), + dashboard_bg_url (text, nullable)
   - staff_users: + permissions (jsonb, default '[]'::jsonb)

3. Security
   - No RLS policy changes. Existing policies on both tables remain intact.
   - The permissions column stores module-level access flags per user,
     readable/writable by the existing anon+authenticated policies.

4. Notes
   - permissions JSONB format: array of { module: string, access: 'view' | 'edit' | 'none' }
   - Empty array means default access (all modules visible per role).
   - Idempotent: uses DO $$ ... IF NOT EXISTS ... END $$ blocks.
*/

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'farm_profile' AND column_name = 'login_bg_url') THEN
    ALTER TABLE farm_profile ADD COLUMN login_bg_url text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'farm_profile' AND column_name = 'dashboard_bg_url') THEN
    ALTER TABLE farm_profile ADD COLUMN dashboard_bg_url text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'staff_users' AND column_name = 'permissions') THEN
    ALTER TABLE staff_users ADD COLUMN permissions jsonb NOT NULL DEFAULT '[]'::jsonb;
  END IF;
END $$;
