CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.roles (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL UNIQUE,
  description TEXT,
  is_deleted  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.permissions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  module      TEXT NOT NULL,
  action      TEXT NOT NULL,
  description TEXT,
  UNIQUE (module, action)
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id       UUID NOT NULL REFERENCES public.roles(id)       ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name  TEXT,
  last_name   TEXT,
  email       TEXT NOT NULL UNIQUE,
  phone       TEXT,
  department  TEXT,
  job_title   TEXT,
  avatar_url  TEXT,
  role_id     UUID REFERENCES public.roles(id) ON DELETE SET NULL,
  status      TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'inactive', 'suspended', 'pending')),
  is_deleted  BOOLEAN NOT NULL DEFAULT FALSE,
  last_login  TIMESTAMPTZ,
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email  TEXT,
  action       TEXT NOT NULL,
  module       TEXT NOT NULL,
  target_id    UUID,
  target_email TEXT,
  details      JSONB,
  ip_address   TEXT,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email       ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role_id     ON public.profiles(role_id);
CREATE INDEX IF NOT EXISTS idx_profiles_status      ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_is_deleted  ON public.profiles(is_deleted);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id  ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module    ON public.audit_logs(module);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER trg_roles_updated_at
  BEFORE UPDATE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Row Level Security Policies
ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs      ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS (used by the Next.js API routes via SUPABASE_SERVICE_ROLE_KEY)
-- No additional policies needed for server-side access.

-- Allow authenticated users to read their own profile
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Allow authenticated users to read roles (needed for dropdowns)
CREATE POLICY "Authenticated users can read roles"
  ON public.roles FOR SELECT
  TO authenticated
  USING (is_deleted = FALSE);

-- Allow authenticated users to read permissions
CREATE POLICY "Authenticated users can read permissions"
  ON public.permissions FOR SELECT
  TO authenticated
  USING (TRUE);
