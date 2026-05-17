-- Create the private Supabase Storage bucket used by service order odometer photos.
-- This block is intentionally no-op on local PostgreSQL installations that do not
-- have the Supabase `storage` schema.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.schemata
    WHERE schema_name = 'storage'
  ) THEN
    INSERT INTO storage.buckets (
      id,
      name,
      public,
      file_size_limit,
      allowed_mime_types
    )
    VALUES (
      'order-odometer',
      'order-odometer',
      false,
      5242880,
      ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
    )
    ON CONFLICT (id) DO UPDATE
    SET
      public = false,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types,
      updated_at = now();
  END IF;
END $$;
