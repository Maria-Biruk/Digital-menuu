-- Update translations for matching existing menu items only.
-- Prices, images, categories, and all other menu fields are left unchanged.
-- Items are matched by their existing English name and the restaurant slug.

WITH translations(en, am, om) AS (
  VALUES
    ('Shiro', 'ሽሮ', 'Shiroo'),
    ('Tegabino', 'ተጋቢኖ', 'Tegabinoo'),
    ('Enkulal Firfir', 'እንቁላል ፍርፍር', 'Firfirii Hanqaaquu'),
    ('Spaghetti', 'ስፓጌቲ', 'Ispegetii'),
    ('Pasta with Vegetables', 'ፓስታ በአትክልት', 'Paastaa Kuduraan'),
    ('Pasta with Meat', 'ፓስታ በስጋ', 'Paastaa Fooniin'),
    ('Ful', 'ፉል', 'Fuul'),
    ('Special Ful', 'ስፔሻል ፉል', 'Fuul Addaa'),
    ('Pasta with Egg', 'ፓስታ በእንቁላል', 'Paastaa Hanqaaquun'),
    ('Chechebsa', 'ጨጨብሳ', 'Caccabsaa'),
    ('Enkulal Sils', 'እንቁላል ስልስ', 'Silsii Hanqaaquu'),
    ('Boiled Egg', 'የተቀቀለ እንቁላል', 'Hanqaaquu Bilcheefame'),
    ('Rice', 'ሩዝ', 'Ruuzii'),
    ('Egg with Meat', 'እንቁላል በስጋ', 'Hanqaaquu Fooniin'),
    ('Tomato', 'ቲማቲም', 'Timaatima'),
    ('Egg Sandwich', 'እንቁላል ሳንድዊች', 'Sandwiichii Hanqaaquu'),
    ('Tasty Soya', 'ጣፋጭ ሶያ', 'Soya Mi''aawaa'),
    ('Tibs', 'ጥብስ', 'Tibbsi'),
    ('Duket', 'ዱኬት', 'Duket'),
    ('Agegl', 'አገግል', 'Agegl'),
    ('Beans with Egg', 'ባቄላ በእንቁላል', 'Baqelaa Hanqaaquun'),
    ('Eggplant', 'ኤግ ፕላንት', 'Eggplant'),
    ('Kombo', 'ኮምቦ', 'Komboo'),
    ('Liver', 'ጉበት', 'Tiruu'),
    ('Intestine', 'አንጀት', 'Mar''imaan'),
    ('Beans with Bread', 'ባቄላ በዳቦ', 'Baqelaa Buddeena Waliin'),
    ('Sudanese Ful with Egg', 'ሱዳን ፉል በእንቁላል', 'Fuul Sudaanii Hanqaaquun'),
    ('Sudanese Ful without Egg', 'ሱዳን ፉል ያለ እንቁላል', 'Fuul Sudaanii Hanqaaquu Malee'),
    ('Irish (Meat)', 'አይሪሽ (ስጋ)', 'Irish (Foon)'),
    ('Irtib', 'እርጥብ', 'Irtib'),
    ('Special Irtib', 'ስፔሻል እርጥብ', 'Irtib Addaa'),
    ('Sambusa', 'ሳምቡሳ', 'Sambusaa'),
    ('Coffee', 'ቡና', 'Buna'),
    ('Tea', 'ሻይ', 'Shaayii'),
    ('Milk', 'ወተት', 'Aannan'),
    ('Ginger Tea', 'ዝንጅብል ሻይ', 'Shaayii Jinjibila'),
    ('Macchiato', 'ማኪያቶ', 'Maakiyaatoo'),
    ('Lemon Tea', 'የሎሚ ሻይ', 'Shaayii Loomii'),
    ('Mango Tea', 'የማንጎ ሻይ', 'Shaayii Maangoo'),
    ('Fanta', 'ፋንታ', 'Fanta'),
    ('Sprite', 'ስፕራይት', 'Sprite'),
    ('Coca-Cola', 'ኮካ ኮላ', 'Coca-Cola'),
    ('Energy Drink', 'ኢነርጂ ድሪንክ', 'Energy Drink'),
    ('Water 0.5 L', 'ውሃ 0.5 ሊትር', 'Bishaan 0.5 Liitira'),
    ('Water 1 L', 'ውሃ 1 ሊትር', 'Bishaan 1 Liitira')
),
updated AS (
  UPDATE public.menu_items AS mi
     SET name_i18n = COALESCE(mi.name_i18n, '{}'::jsonb)
                     || jsonb_build_object('en', t.en, 'am', t.am, 'om', t.om)
    FROM translations AS t
   WHERE mi.name_i18n->>'en' = t.en
     AND EXISTS (
       SELECT 1
         FROM public.categories AS c
         JOIN public.restaurants AS r ON r.id = c.restaurant_id
        WHERE c.id = mi.category_id
          AND r.slug = 'meskel-house'
     )
  RETURNING mi.name_i18n
)
SELECT name_i18n->>'en' AS english,
       name_i18n->>'am' AS amharic,
       name_i18n->>'om' AS afaan_oromo
  FROM updated
 ORDER BY english;
