-- Replace the active Skill Coffee catalog with the provided 3-language menu.
-- Prices are intentionally 0 ETB for now, as requested.
-- Existing menu rows are hidden (not deleted) so historical orders remain intact.

DO $$
DECLARE
  v_restaurant_id uuid;
  category_record record;
  summary_record record;
BEGIN
CREATE TEMP TABLE menu_category_seed (
  slug text,
  name_en text,
  name_am text,
  name_om text,
  sort_order integer
) ON COMMIT DROP;

INSERT INTO menu_category_seed VALUES
  ('food', 'Food', 'ምግብ', 'Nyaata', 1),
  ('additional-food', 'Additional Food', 'ተጨማሪ ምግብ', 'Nyaata Dabalataa', 2),
  ('fast-food', 'Fast Food', 'ፈጣን ምግብ', 'Nyaata Daddafaa', 3),
  ('hot-drinks', 'Hot Drinks', 'ትኩስ መጠጦች', 'Dhugaatii Ho''aa', 4),
  ('soft-drinks', 'Soft Drinks', 'ቀዝቃዛ መጠጦች', 'Dhugaatii Qabbanaawaa', 5);

CREATE TEMP TABLE menu_item_seed (
  category_slug text,
  name_en text,
  name_am text,
  name_om text,
  station text,
  prep_minutes integer,
  sort_order integer
) ON COMMIT DROP;

INSERT INTO menu_item_seed VALUES
  ('food', 'Shiro', 'ሽሮ', 'Shiroo', 'kitchen', 10, 1),
  ('food', 'Tegabino', 'ተጋቢኖ', 'Tegabinoo', 'kitchen', 12, 2),
  ('food', 'Enkulal Firfir', 'እንቁላል ፍርፍር', 'Firfirii Hanqaaquu', 'kitchen', 10, 3),
  ('food', 'Spaghetti', 'ስፓጌቲ', 'Ispegetii', 'kitchen', 15, 4),
  ('food', 'Pasta with Vegetables', 'ፓስታ በአትክልት', 'Paastaa Kuduraan', 'kitchen', 15, 5),
  ('food', 'Pasta with Meat', 'ፓስታ በስጋ', 'Paastaa Fooniin', 'kitchen', 15, 6),
  ('food', 'Ful', 'ፉል', 'Fuul', 'kitchen', 8, 7),
  ('food', 'Special Ful', 'ስፔሻል ፉል', 'Fuul Addaa', 'kitchen', 10, 8),
  ('food', 'Pasta with Egg', 'ፓስታ በእንቁላል', 'Paastaa Hanqaaquun', 'kitchen', 12, 9),
  ('food', 'Chechebsa', 'ጨጨብሳ', 'Caccabsaa', 'kitchen', 12, 10),
  ('food', 'Enkulal Sils', 'እንቁላል ስልስ', 'Silsii Hanqaaquu', 'kitchen', 10, 11),
  ('food', 'Boiled Egg', 'የተቀቀለ እንቁላል', 'Hanqaaquu Bilcheefame', 'kitchen', 6, 12),
  ('food', 'Rice', 'ሩዝ', 'Ruuzii', 'kitchen', 10, 13),
  ('food', 'Egg with Meat', 'እንቁላል በስጋ', 'Hanqaaquu Fooniin', 'kitchen', 12, 14),
  ('food', 'Tomato', 'ቲማቲም', 'Timaatima', 'kitchen', 5, 15),
  ('food', 'Egg Sandwich', 'እንቁላል ሳንድዊች', 'Sandwiichii Hanqaaquu', 'kitchen', 8, 16),
  ('food', 'Tasty Soya', 'ጣፋጭ ሶያ', 'Soya Mi''aawaa', 'kitchen', 10, 17),
  ('food', 'Tibs', 'ጥብስ', 'Tibbsi', 'kitchen', 15, 18),
  ('food', 'Duket', 'ዱኬት', 'Duket', 'kitchen', 15, 19),
  ('food', 'Agegl', 'አገግል', 'Agegl', 'kitchen', 15, 20),

  ('additional-food', 'Beans with Egg', 'ባቄላ በእንቁላል', 'Baqelaa Hanqaaquun', 'kitchen', 10, 1),
  ('additional-food', 'Eggplant', 'ኤግ ፕላንት', 'Eggplant', 'kitchen', 12, 2),
  ('additional-food', 'Kombo', 'ኮምቦ', 'Komboo', 'kitchen', 15, 3),
  ('additional-food', 'Liver', 'ጉበት', 'Tiruu', 'kitchen', 12, 4),
  ('additional-food', 'Intestine', 'አንጀት', 'Mar''imaan', 'kitchen', 15, 5),
  ('additional-food', 'Beans with Bread', 'ባቄላ በዳቦ', 'Baqelaa Buddeena Waliin', 'kitchen', 8, 6),
  ('additional-food', 'Sudanese Ful with Egg', 'ሱዳን ፉል በእንቁላል', 'Fuul Sudaanii Hanqaaquun', 'kitchen', 10, 7),
  ('additional-food', 'Sudanese Ful without Egg', 'ሱዳን ፉል ያለ እንቁላል', 'Fuul Sudaanii Hanqaaquu Malee', 'kitchen', 8, 8),
  ('additional-food', 'Irish (Meat)', 'አይሪሽ (ስጋ)', 'Irish (Foon)', 'kitchen', 15, 9),

  ('fast-food', 'Irtib', 'እርጥብ', 'Irtib', 'kitchen', 5, 1),
  ('fast-food', 'Special Irtib', 'ስፔሻል እርጥብ', 'Irtib Addaa', 'kitchen', 6, 2),
  ('fast-food', 'Sambusa', 'ሳምቡሳ', 'Sambusaa', 'kitchen', 5, 3),

  ('hot-drinks', 'Coffee', 'ቡና', 'Buna', 'bar', 5, 1),
  ('hot-drinks', 'Tea', 'ሻይ', 'Shaayii', 'bar', 4, 2),
  ('hot-drinks', 'Milk', 'ወተት', 'Aannan', 'bar', 3, 3),
  ('hot-drinks', 'Ginger Tea', 'ዝንጅብል ሻይ', 'Shaayii Jinjibila', 'bar', 6, 4),
  ('hot-drinks', 'Macchiato', 'ማኪያቶ', 'Maakiyaatoo', 'bar', 4, 5),
  ('hot-drinks', 'Lemon Tea', 'የሎሚ ሻይ', 'Shaayii Loomii', 'bar', 5, 6),
  ('hot-drinks', 'Mango Tea', 'የማንጎ ሻይ', 'Shaayii Maangoo', 'bar', 5, 7),

  ('soft-drinks', 'Fanta', 'ፋንታ', 'Fanta', 'bar', 1, 1),
  ('soft-drinks', 'Sprite', 'ስፕራይት', 'Sprite', 'bar', 1, 2),
  ('soft-drinks', 'Coca-Cola', 'ኮካ ኮላ', 'Coca-Cola', 'bar', 1, 3),
  ('soft-drinks', 'Energy Drink', 'ኢነርጂ ድሪንክ', 'Energy Drink', 'bar', 1, 4),
  ('soft-drinks', 'Water 0.5 L', 'ውሃ 0.5 ሊትር', 'Bishaan 0.5 Liitira', 'bar', 1, 5),
  ('soft-drinks', 'Water 1 L', 'ውሃ 1 ሊትር', 'Bishaan 1 Liitira', 'bar', 1, 6);

  SELECT id INTO v_restaurant_id
    FROM restaurants
   WHERE slug = 'meskel-house';
  IF v_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'Restaurant meskel-house not found.';
  END IF;

  FOR category_record IN SELECT * FROM menu_category_seed ORDER BY sort_order LOOP
    UPDATE categories
       SET name_i18n = jsonb_build_object(
             'en', category_record.name_en,
             'am', category_record.name_am,
             'om', category_record.name_om
           ),
           sort_order = category_record.sort_order,
           is_active = true
     WHERE categories.restaurant_id = v_restaurant_id
       AND categories.slug = category_record.slug;

    IF NOT FOUND THEN
      INSERT INTO categories (
        restaurant_id, slug, name_i18n, meal_period, sort_order, is_active
      ) VALUES (
        v_restaurant_id,
        category_record.slug,
        jsonb_build_object(
          'en', category_record.name_en,
          'am', category_record.name_am,
          'om', category_record.name_om
        ),
        'all_day',
        category_record.sort_order,
        true
      );
    END IF;
  END LOOP;

  UPDATE categories
     SET is_active = slug IN (SELECT slug FROM menu_category_seed)
   WHERE categories.restaurant_id = v_restaurant_id;

  UPDATE menu_items
     SET is_available = false
   WHERE category_id IN (
     SELECT id FROM categories WHERE categories.restaurant_id = v_restaurant_id
   );

-- Update one matching row per item and leave duplicate/old rows unavailable.
WITH matches AS (
  SELECT
    mi.id,
    c.id AS category_id,
    s.name_en,
    s.name_am,
    s.name_om,
    s.station,
    s.prep_minutes,
    s.sort_order,
    row_number() OVER (
      PARTITION BY c.id, s.name_en
      ORDER BY mi.id
    ) AS row_num
  FROM menu_items AS mi
  JOIN categories AS c ON c.id = mi.category_id
  JOIN restaurants AS r ON r.id = c.restaurant_id
  JOIN menu_item_seed AS s
    ON s.category_slug = c.slug
   AND s.name_en = mi.name_i18n->>'en'
  WHERE r.slug = 'meskel-house'
)
UPDATE menu_items AS mi
   SET name_i18n = jsonb_build_object('en', m.name_en, 'am', m.name_am, 'om', m.name_om),
       description_i18n = jsonb_build_object('en', m.name_en, 'am', m.name_am, 'om', m.name_om),
       price = 0,
       station = m.station::station,
       avg_prep_minutes = m.prep_minutes,
       is_available = true,
       sort_order = m.sort_order
  FROM matches AS m
 WHERE mi.id = m.id
   AND m.row_num = 1;

INSERT INTO menu_items (
  category_id,
  name_i18n,
  description_i18n,
  price,
  image_path,
  dietary_tags,
  station,
  avg_prep_minutes,
  is_available,
  calories,
  ingredients,
  rating,
  tag,
  sort_order
)
SELECT
  c.id,
  jsonb_build_object('en', s.name_en, 'am', s.name_am, 'om', s.name_om),
  jsonb_build_object('en', s.name_en, 'am', s.name_am, 'om', s.name_om),
  0,
  NULL,
  ARRAY[]::text[],
  s.station::station,
  s.prep_minutes,
  true,
  0,
  ARRAY[]::text[],
  0,
  NULL,
  s.sort_order
FROM menu_item_seed AS s
JOIN categories AS c ON c.slug = s.category_slug
JOIN restaurants AS r ON r.id = c.restaurant_id
WHERE r.slug = 'meskel-house'
  AND NOT EXISTS (
    SELECT 1
      FROM menu_items AS existing
     WHERE existing.category_id = c.id
       AND existing.name_i18n->>'en' = s.name_en
  );

-- Report the active catalog without requiring a second SQL-editor statement.
FOR summary_record IN
  SELECT
    c.slug AS category,
    count(m.id) AS available_items,
    count(m.id) FILTER (WHERE m.price = 0) AS zero_price_items
  FROM categories AS c
  JOIN restaurants AS r ON r.id = c.restaurant_id
  LEFT JOIN menu_items AS m
    ON m.category_id = c.id
   AND m.is_available = true
  WHERE r.slug = 'meskel-house'
    AND c.is_active = true
  GROUP BY c.slug, c.sort_order
  ORDER BY c.sort_order
LOOP
  RAISE NOTICE '%: % available items (% with 0 ETB price)',
    summary_record.category,
    summary_record.available_items,
    summary_record.zero_price_items;
END LOOP;
END;
$$;
