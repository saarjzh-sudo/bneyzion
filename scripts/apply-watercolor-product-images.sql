-- רמה 13 (9.7.2026) — החלפת תמונות-מוצר לסדרת האקוורל (הקו של יואב).
-- גיבוי: products_bak_20260709 (47 שורות, נוצר לפני ההעלאה).
-- להחיל רק אחרי אישור מפורש של סער. אידמפוטנטי — מפתח לפי title.
-- שחזור מלא: update products p set image_url=b.image_url from products_bak_20260709 b where b.id=p.id;

with mapping(title, img) as (values
  -- ספרים בודדים (פיזי + דיגיטלי מקבלים אותה תמונה)
  ('ספר יהושע | 360 עמודים',                          'watercolor/yehoshua.jpg'),
  ('מגילת רות | מכלל יופי',                            'watercolor/ruth.png'),
  ('מגילת רות | הספר הדיגיטלי',                        'watercolor/ruth.png'),
  ('שופטים | מכלל יופי',                               'watercolor/shoftim.jpg'),
  ('שופטים | מכלל יופי | הספר הדיגיטלי',               'watercolor/shoftim.jpg'),
  ('מגילת אסתר | מכלל יופי',                           'watercolor/esther.jpg'),
  ('מגילת אסתר | מכלל יופי | הספר הדיגיטלי',           'watercolor/esther.jpg'),
  ('מגילת שיר השירים | מכלל יופי',                     'watercolor/shir.jpg'),
  ('שיר השירים | מכלל יופי | הספר הדיגיטלי',           'watercolor/shir.jpg'),
  ('מגילת קהלת | מכלל יופי',                           'watercolor/kohelet.jpg'),
  ('מגילת קהלת | מכלל יופי | הספר הדיגיטלי',           'watercolor/kohelet.jpg'),
  ('מגילת איכה | מכלל יופי',                           'watercolor/eicha.jpg'),
  ('מגילת איכה | מכלל יופי | הספר הדיגיטלי',           'watercolor/eicha.jpg'),
  ('ספר יונה | מכלל יופי | הספר הדיגיטלי',             'watercolor/yona.jpg'),  -- מתקן גם את באג-אסתר
  -- בנדלים
  ('2 ספרי מגילת רות במחיר מיוחד',                     'watercolor/bundle_2ruth.jpg'),
  ('2 ספרי מגילת אסתר במחיר מיוחד',                    'watercolor/bundle_2esther.jpg'),
  ('2 ספרי שופטים במחיר מיוחד | מכלל יופי',            'watercolor/bundle_2shoftim.jpg'),
  ('2 מגילות קהלת במחיר מיוחד | מכלל יופי',            'watercolor/bundle_2kohelet.jpg'),
  ('אסתר + שיר השירים במחיר מיוחד',                    'watercolor/bundle_esther_shir.jpg'),
  ('סט מכלל יופי על חמש מגילות',                       'watercolor/bundle_set5.jpg'),
  ('סדרת ספרי מכלל יופי | חמש מגילות + שופטים',        'watercolor/bundle_series6.jpg'),
  ('השלמה לסט על המגילות – שלשה ספרים',                'watercolor/bundle_hashlama3.jpg'),
  ('השלמה לסט מכלל יופי על המגילות – ארבעה ספרים',     'watercolor/bundle_hashlama4.jpg')
  -- לא נכללו בכוונה: תרומת-שופטים-לחיילים (דימוי-תרומה ייעודי), מתחדשים-בתנ"ך,
  -- מנויים, קורסים דיגיטליים, אזורים-בארץ-ישראל, וכל ה-draft (חומשים/נביאים שטרם יצאו).
)
update products p
set image_url = 'https://pzvmwfexeiruelwiujxn.supabase.co/storage/v1/object/public/product-images/' || m.img,
    updated_at = now()
from mapping m
where p.title = m.title;

-- אימות: אמור להחזיר 24
select count(*) as updated from products
where image_url like '%/product-images/watercolor/%';
