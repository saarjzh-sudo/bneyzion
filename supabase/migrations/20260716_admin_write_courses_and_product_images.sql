-- רמה 19: כתיבת-אדמין לקורסים + העלאת תמונות (הבאגים שיואב פגש 15.7 בערב)
-- community_courses / community_course_lessons היו עם anon_read בלבד —
-- כל יצירה/עריכה/הוספת-שיעור מהדפדפן נחסמה ב-RLS.
-- bucket product-images היה ללא policy כתיבה — העלאת תמונת קורס/מוצר נכשלה.

-- 1) קורסים — אדמין כותב הכל
create policy admin_all on public.community_courses
  for all
  using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));

create policy admin_all on public.community_course_lessons
  for all
  using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));

-- 2) product-images — אדמין מעלה/מעדכן/מוחק (קריאה ציבורית קיימת דרך public bucket)
create policy product_images_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and has_role(auth.uid(), 'admin'::app_role));

create policy product_images_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and has_role(auth.uid(), 'admin'::app_role));

create policy product_images_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and has_role(auth.uid(), 'admin'::app_role));
