-- Update only the English, Amharic, and Afaan Oromo menu-item names.
-- Prices, descriptions, categories, availability, orders, and other fields
-- are intentionally left unchanged.

WITH translations (category_slug, name_en, name_am, name_om) AS (
  VALUES
    ('food', 'Shiro', 'ሽሮ', 'Shiroo'),
    ('food', 'Tegabino', 'ተጋቢኖ', 'Tegabinoo'),
    ('food', 'Enkulal Firfir', 'እንቁላል ፍርፍር', 'Firfirii Hanqaaquu'),
    ('food', 'Spaghetti', 'ስፓጌቲ', 'Ispegetii'),
    ('food', 'Pasta with Vegetables', 'ፓስታ በአትክልት', 'Paastaa Kuduraan'),
    ('food', 'Pasta with Meat', 'ፓስታ በስጋ', 'Paastaa Fooniin'),
    ('food', 'Ful', 'ፉል', 'Fuul'),
    ('food', 'Special Ful', 'ስፔሻል ፉል', 'Fuul Addaa'),
    ('food', 'Pasta with Egg', 'ፓስታ በእንቁላል', 'Paastaa Hanqaaquun'),
    ('food', 'Chechebsa', 'ጨጨብሳ', 'Caccabsaa'),
    ('food', 'Enkulal Sils', 'እንቁላል ስልስ', 'Silsii Hanqaaquu'),
    ('food', 'Boiled Egg', 'የተቀቀለ እንቁላል', 'Hanqaaquu Bilcheefame'),
    ('food', 'Rice', 'ሩዝ', 'Ruuzii'),
    ('food', 'Egg with Meat', 'እንቁላል በስጋ', 'Hanqaaquu Fooniin'),
    ('food', 'Tomato', 'ቲማቲም', 'Timaatima'),
    ('food', 'Egg Sandwich', 'እንቁላል ሳንድዊች', 'Sandwiichii Hanqaaquu'),
    ('food', 'Tasty Soya', 'ጣፋጭ ሶያ', 'Soya Mi''aawaa'),
    ('food', 'Tibs', 'ጥብስ', 'Tibbsi'),
    ('food', 'Duket', 'ዱኬት', 'Duket'),
    ('food', 'Agegl', 'አገግል', 'Agegl'),

    ('additional-food', 'Beans with Egg', 'ባቄላ በእንቁላል', 'Baqelaa Hanqaaquun'),
    ('additional-food', 'Eggplant', 'ኤግ ፕላንት', 'Eggplant'),
    ('additional-food', 'Kombo', 'ኮምቦ', 'Komboo'),
    ('additional-food', 'Liver', 'ጉበት', 'Tiruu'),
    ('additional-food', 'Intestine', 'አንጀት', 'Mar''imaan'),
    ('additional-food', 'Beans with Bread', 'ባቄላ በዳቦ', 'Baqelaa Buddeena Waliin'),
    ('additional-food', 'Sudanese Ful with Egg', 'ሱዳን ፉል በእንቁላል', 'Fuul Sudaanii Hanqaaquun'),
    ('additional-food', 'Sudanese Ful without Egg', 'ሱዳን ፉል ያለ እንቁላል', 'Fuul Sudaanii Hanqaaquu Malee'),
    ('additional-food', 'Irish (Meat)', 'አይሪሽ (ስጋ)', 'Irish (Foon)'),

    ('fast-food', 'Irtib', 'እርጥብ', 'Irtib'),
    ('fast-food', 'Special Irtib', 'ስፔሻል እርጥብ', 'Irtib Addaa'),
    ('fast-food', 'Sambusa', 'ሳምቡሳ', 'Sambusaa'),

    ('hot-drinks', 'Coffee', 'ቡና', 'Buna'),
    ('hot-drinks', 'Tea', 'ሻይ', 'Shaayii'),
    ('hot-drinks', 'Milk', 'ወተት', 'Aannan'),
    ('hot-drinks', 'Ginger Tea', 'ዝንጅብል ሻይ', 'Shaayii Jinjibila'),
    ('hot-drinks', 'Macchiato', 'ማኪያቶ', 'Maakiyaatoo'),
    ('hot-drinks', 'Lemon Tea', 'የሎሚ ሻይ', 'Shaayii Loomii'),
    ('hot-drinks', 'Mango Tea', 'የማንጎ ሻይ', 'Shaayii Maangoo'),

    ('soft-drinks', 'Fanta', 'ፋንታ', 'Fanta'),
    ('soft-drinks', 'Sprite', 'ስፕራይት', 'Sprite'),
    ('soft-drinks', 'Coca-Cola', 'ኮካ ኮላ', 'Coca-Cola'),
    ('soft-drinks', 'Energy Drink', 'ኢነርጂ ድሪንክ', 'Energy Drink'),
    ('soft-drinks', 'Water 0.5 L', 'ውሃ 0.5 ሊትር', 'Bishaan 0.5 Liitira'),
    ('soft-drinks', 'Water 1 L', 'ውሃ 1 ሊትር', 'Bishaan 1 Liitira')
)
UPDATE public.menu_items AS item
   SET name_i18n = COALESCE(item.name_i18n, '{}'::jsonb) ||
       jsonb_build_object(
         'en', translations.name_en,
         'am', translations.name_am,
         'om', translations.name_om
       )
  FROM public.categories AS category
  JOIN public.restaurants AS restaurant
    ON restaurant.id = category.restaurant_id
  JOIN translations
    ON translations.category_slug = category.slug
 WHERE item.category_id = category.id
   AND restaurant.slug = 'meskel-house'
   AND item.name_i18n ->> 'en' = translations.name_en
RETURNING item.name_i18n ->> 'en' AS english,
          item.name_i18n ->> 'am' AS amharic,
          item.name_i18n ->> 'om' AS afaan_oromo;
