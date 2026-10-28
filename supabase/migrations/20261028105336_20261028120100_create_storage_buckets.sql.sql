/*
# Create storage buckets for HMS documents and training certificates

## Buckets
- `hms-documents`: public read, authenticated write — stores safety manuals, PDFs, guidelines uploaded by admins.
- `training-certificates`: public read, authenticated write — stores forklift training certificate files (PDF/images) uploaded by admins.

## Storage policies
- Public SELECT on both buckets (anyone can read/download documents and certificates).
- Authenticated INSERT/UPDATE/DELETE on both buckets, restricted to admins via the profiles table role check.

## Notes
- Uses `storage.buckets` and `storage.objects` system tables.
- Policies are on `storage.objects`.
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('hms-documents', 'hms-documents', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('training-certificates', 'training-certificates', true)
ON CONFLICT (id) DO NOTHING;

-- hms-documents: public read
DROP POLICY IF EXISTS "public_read_hms_docs" ON storage.objects;
CREATE POLICY "public_read_hms_docs"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'hms-documents');

-- hms-documents: admin write
DROP POLICY IF EXISTS "admin_insert_hms_docs" ON storage.objects;
CREATE POLICY "admin_insert_hms_docs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'hms-documents'
  AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

DROP POLICY IF EXISTS "admin_update_hms_docs" ON storage.objects;
CREATE POLICY "admin_update_hms_docs"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'hms-documents'
  AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
)
WITH CHECK (
  bucket_id = 'hms-documents'
  AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

DROP POLICY IF EXISTS "admin_delete_hms_docs" ON storage.objects;
CREATE POLICY "admin_delete_hms_docs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'hms-documents'
  AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- training-certificates: public read
DROP POLICY IF EXISTS "public_read_certs" ON storage.objects;
CREATE POLICY "public_read_certs"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'training-certificates');

-- training-certificates: admin write
DROP POLICY IF EXISTS "admin_insert_certs" ON storage.objects;
CREATE POLICY "admin_insert_certs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'training-certificates'
  AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

DROP POLICY IF EXISTS "admin_update_certs" ON storage.objects;
CREATE POLICY "admin_update_certs"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'training-certificates'
  AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
)
WITH CHECK (
  bucket_id = 'training-certificates'
  AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

DROP POLICY IF EXISTS "admin_delete_certs" ON storage.objects;
CREATE POLICY "admin_delete_certs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'training-certificates'
  AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);
