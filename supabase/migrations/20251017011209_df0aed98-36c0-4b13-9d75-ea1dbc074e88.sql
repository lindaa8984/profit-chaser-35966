-- إضافة حقل لرابط ملف العقد في جدول contracts
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_file_url TEXT;

-- إنشاء bucket للعقود
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('contracts', 'contracts', false, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- سياسات تخزين العقود
CREATE POLICY "المستخدمون يمكنهم عرض ملفات عقودهم" ON storage.objects
FOR SELECT USING (
  bucket_id = 'contracts' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "المستخدمون يمكنهم رفع ملفات عقودهم" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'contracts' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "المستخدمون يمكنهم تحديث ملفات عقودهم" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'contracts' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "المستخدمون يمكنهم حذف ملفات عقودهم" ON storage.objects
FOR DELETE USING (
  bucket_id = 'contracts' AND
  auth.uid()::text = (storage.foldername(name))[1]
);