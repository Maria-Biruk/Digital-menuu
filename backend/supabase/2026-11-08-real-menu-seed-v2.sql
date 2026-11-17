-- =============================================================================
-- REAL MENU SEED v2 — Skill Coffee  (foreign-key safe)
-- Cannot DELETE old menu_items because order_items references them.
-- Instead: marks all existing items is_available=false (hidden from menu)
-- then INSERTs the 45 real items fresh.
-- =============================================================================

DO $$
DECLARE
  rid            uuid;
  cid_food       uuid;
  cid_fastfood   uuid;
  cid_hotdrinks  uuid;
  cid_softdrinks uuid;
BEGIN

  SELECT id INTO rid FROM restaurants WHERE slug = 'meskel-house';
  IF rid IS NULL THEN RAISE EXCEPTION 'Restaurant meskel-house not found.'; END IF;

  -- 1. Upsert the four real categories
  UPDATE categories SET name_i18n='{"en":"Food","am":"ምግብ","om":"Nyaata"}'::jsonb,sort_order=1,is_active=true WHERE restaurant_id=rid AND slug='food';
  IF NOT FOUND THEN INSERT INTO categories(restaurant_id,slug,name_i18n,meal_period,sort_order,is_active) VALUES(rid,'food','{"en":"Food","am":"ምግብ","om":"Nyaata"}'::jsonb,'all_day',1,true); END IF;

  UPDATE categories SET name_i18n='{"en":"Fast Food","am":"ፈጣን ምግብ","om":"Nyaata Daddafaa"}'::jsonb,sort_order=2,is_active=true WHERE restaurant_id=rid AND slug='fast-food';
  IF NOT FOUND THEN INSERT INTO categories(restaurant_id,slug,name_i18n,meal_period,sort_order,is_active) VALUES(rid,'fast-food','{"en":"Fast Food","am":"ፈጣን ምግብ","om":"Nyaata Daddafaa"}'::jsonb,'all_day',2,true); END IF;

  UPDATE categories SET name_i18n='{"en":"Hot Drinks","am":"ትኩስ መጠጦች","om":"Dhugaatii Ho''aa"}'::jsonb,sort_order=3,is_active=true WHERE restaurant_id=rid AND slug='hot-drinks';
  IF NOT FOUND THEN INSERT INTO categories(restaurant_id,slug,name_i18n,meal_period,sort_order,is_active) VALUES(rid,'hot-drinks','{"en":"Hot Drinks","am":"ትኩስ መጠጦች","om":"Dhugaatii Ho''aa"}'::jsonb,'all_day',3,true); END IF;

  UPDATE categories SET name_i18n='{"en":"Soft Drinks","am":"ቀዝቃዛ መጠጦች","om":"Dhugaatii Qabbanaawaa"}'::jsonb,sort_order=4,is_active=true WHERE restaurant_id=rid AND slug='soft-drinks';
  IF NOT FOUND THEN INSERT INTO categories(restaurant_id,slug,name_i18n,meal_period,sort_order,is_active) VALUES(rid,'soft-drinks','{"en":"Soft Drinks","am":"ቀዝቃዛ መጠጦች","om":"Dhugaatii Qabbanaawaa"}'::jsonb,'all_day',4,true); END IF;

  -- Deactivate old demo categories
  UPDATE categories SET is_active=false WHERE restaurant_id=rid
    AND slug IN ('coffee-drinks','milkshakes','breakfast','ethiopian-food','lunch','pizza-pasta','cocktails','desserts','coffee');

  -- 2. Hide ALL existing menu items (safe — keeps order_items references intact)
  UPDATE menu_items SET is_available=false
   WHERE category_id IN (SELECT id FROM categories WHERE restaurant_id=rid);

  -- Resolve IDs
  SELECT id INTO cid_food       FROM categories WHERE restaurant_id=rid AND slug='food';
  SELECT id INTO cid_fastfood   FROM categories WHERE restaurant_id=rid AND slug='fast-food';
  SELECT id INTO cid_hotdrinks  FROM categories WHERE restaurant_id=rid AND slug='hot-drinks';
  SELECT id INTO cid_softdrinks FROM categories WHERE restaurant_id=rid AND slug='soft-drinks';

  -- 3a. FOOD (29 items)
  INSERT INTO menu_items(category_id,name_i18n,description_i18n,price,station,avg_prep_minutes,dietary_tags,is_available,sort_order) VALUES
    (cid_food,'{"en":"Shiro","am":"ሽሮ","om":"Shiroo"}'::jsonb,'{"en":"Traditional Ethiopian chickpea stew.","am":"ሽሮ ወጥ።","om":"Shiroo aadaa."}'::jsonb,0,'kitchen'::station,10,ARRAY['vegan','fasting']::text[],true,1),
    (cid_food,'{"en":"Tegabino","am":"ተጋቢኖ","om":"Tegabinoo"}'::jsonb,'{"en":"Lentil or chickpea dish with onions and spices.","am":"ተጋቢኖ።","om":"Tegabinoo."}'::jsonb,0,'kitchen'::station,12,ARRAY['vegan','fasting']::text[],true,2),
    (cid_food,'{"en":"Enkulal Firfir","am":"እንቁላል ፍርፍር","om":"Firfirii Hanqaaquu"}'::jsonb,'{"en":"Scrambled eggs with injera and spices.","am":"እንቁላል ፍርፍር።","om":"Firfirii Hanqaaquu."}'::jsonb,0,'kitchen'::station,10,ARRAY['vegetarian']::text[],true,3),
    (cid_food,'{"en":"Spaghetti","am":"ስፓጌቲ","om":"Ispegetii"}'::jsonb,'{"en":"Classic spaghetti with tomato sauce.","am":"ስፓጌቲ።","om":"Ispegetii."}'::jsonb,0,'kitchen'::station,15,ARRAY[]::text[],true,4),
    (cid_food,'{"en":"Pasta with Vegetables","am":"ፓስታ በአትክልት","om":"Paastaa Kuduraan"}'::jsonb,'{"en":"Pasta with fresh vegetables.","am":"ፓስታ በአትክልት።","om":"Paastaa Kuduraan."}'::jsonb,0,'kitchen'::station,15,ARRAY['vegetarian']::text[],true,5),
    (cid_food,'{"en":"Pasta with Meat","am":"ፓስታ በስጋ","om":"Paastaa Fooniin"}'::jsonb,'{"en":"Pasta with seasoned meat.","am":"ፓስታ በስጋ።","om":"Paastaa Fooniin."}'::jsonb,0,'kitchen'::station,15,ARRAY['halal']::text[],true,6),
    (cid_food,'{"en":"Ful","am":"ፉል","om":"Fuul"}'::jsonb,'{"en":"Mashed fava beans with oil and spices.","am":"ፉል።","om":"Fuul."}'::jsonb,0,'kitchen'::station,8,ARRAY['vegan','fasting']::text[],true,7),
    (cid_food,'{"en":"Special Ful","am":"ስፔሻል ፉል","om":"Fuul Addaa"}'::jsonb,'{"en":"Fava beans with egg and tomato.","am":"ስፔሻል ፉል።","om":"Fuul Addaa."}'::jsonb,0,'kitchen'::station,10,ARRAY['vegetarian']::text[],true,8),
    (cid_food,'{"en":"Pasta with Egg","am":"ፓስታ በእንቁላል","om":"Paastaa Hanqaaquun"}'::jsonb,'{"en":"Pasta with fried or scrambled egg.","am":"ፓስታ በእንቁላል።","om":"Paastaa Hanqaaquun."}'::jsonb,0,'kitchen'::station,12,ARRAY['vegetarian']::text[],true,9),
    (cid_food,'{"en":"Chechebsa","am":"ጨጨብሳ","om":"Caccabsaa"}'::jsonb,'{"en":"Torn flatbread with spiced butter and berbere.","am":"ጨጨብሳ።","om":"Caccabsaa."}'::jsonb,0,'kitchen'::station,12,ARRAY['vegetarian']::text[],true,10),
    (cid_food,'{"en":"Enkulal Sils","am":"እንቁላል ስልስ","om":"Silsii Hanqaaquu"}'::jsonb,'{"en":"Eggs poached in spiced tomato sauce.","am":"እንቁላል ስልስ።","om":"Silsii Hanqaaquu."}'::jsonb,0,'kitchen'::station,10,ARRAY['vegetarian']::text[],true,11),
    (cid_food,'{"en":"Boiled Egg","am":"የተቀቀለ እንቁላል","om":"Hanqaaquu Bilcheefame"}'::jsonb,'{"en":"Hard or soft boiled eggs.","am":"የተቀቀለ እንቁላል።","om":"Hanqaaquu Bilcheefame."}'::jsonb,0,'kitchen'::station,6,ARRAY['vegetarian','gluten-free']::text[],true,12),
    (cid_food,'{"en":"Rice","am":"ሩዝ","om":"Ruuzii"}'::jsonb,'{"en":"Steamed white rice.","am":"ሩዝ።","om":"Ruuzii."}'::jsonb,0,'kitchen'::station,10,ARRAY['vegan','gluten-free']::text[],true,13),
    (cid_food,'{"en":"Egg with Meat","am":"እንቁላል በስጋ","om":"Hanqaaquu Fooniin"}'::jsonb,'{"en":"Eggs cooked with seasoned meat.","am":"እንቁላል በስጋ።","om":"Hanqaaquu Fooniin."}'::jsonb,0,'kitchen'::station,12,ARRAY['halal']::text[],true,14),
    (cid_food,'{"en":"Tomato","am":"ቲማቲም","om":"Timaatima"}'::jsonb,'{"en":"Fresh tomato salad.","am":"ቲማቲም።","om":"Timaatima."}'::jsonb,0,'kitchen'::station,5,ARRAY['vegan','gluten-free']::text[],true,15),
    (cid_food,'{"en":"Egg Sandwich","am":"እንቁላል ሳንድዊች","om":"Sandwiichii Hanqaaquu"}'::jsonb,'{"en":"Bread sandwich with fried egg.","am":"እንቁላል ሳንድዊች።","om":"Sandwiichii Hanqaaquu."}'::jsonb,0,'kitchen'::station,8,ARRAY['vegetarian']::text[],true,16),
    (cid_food,'{"en":"Tasty Soya","am":"ጣፋጭ ሶያ","om":"Soya Mi''aawaa"}'::jsonb,'{"en":"Flavorful soya dish with spices.","am":"ጣፋጭ ሶያ።","om":"Soya Mi''aawaa."}'::jsonb,0,'kitchen'::station,10,ARRAY['vegan','fasting']::text[],true,17),
    (cid_food,'{"en":"Tibs","am":"ጥብስ","om":"Tibbsi"}'::jsonb,'{"en":"Pan-fried meat with onions and spices.","am":"ጥብስ።","om":"Tibbsi."}'::jsonb,0,'kitchen'::station,15,ARRAY['halal','gluten-free']::text[],true,18),
    (cid_food,'{"en":"Duket","am":"ዱኬት","om":"Duket"}'::jsonb,'{"en":"Traditional Ethiopian spiced stew.","am":"ዱኬት።","om":"Duket."}'::jsonb,0,'kitchen'::station,15,ARRAY['halal']::text[],true,19),
    (cid_food,'{"en":"Agegl","am":"አገግል","om":"Agegl"}'::jsonb,'{"en":"Ethiopian specialty dish.","am":"አገግል።","om":"Agegl."}'::jsonb,0,'kitchen'::station,15,ARRAY['halal']::text[],true,20),
    (cid_food,'{"en":"Beans with Egg","am":"ባቄላ በእንቁላል","om":"Baqelaa Hanqaaquun"}'::jsonb,'{"en":"Cooked beans with egg.","am":"ባቄላ በእንቁላል።","om":"Baqelaa Hanqaaquun."}'::jsonb,0,'kitchen'::station,10,ARRAY['vegetarian']::text[],true,21),
    (cid_food,'{"en":"Eggplant","am":"ኤግ ፕላንት","om":"Eggplant"}'::jsonb,'{"en":"Cooked eggplant with spices.","am":"ኤግ ፕላንት።","om":"Eggplant."}'::jsonb,0,'kitchen'::station,12,ARRAY['vegan','fasting']::text[],true,22),
    (cid_food,'{"en":"Kombo","am":"ኮምቦ","om":"Komboo"}'::jsonb,'{"en":"Combination plate of dishes.","am":"ኮምቦ።","om":"Komboo."}'::jsonb,0,'kitchen'::station,15,ARRAY[]::text[],true,23),
    (cid_food,'{"en":"Liver","am":"ጉበት","om":"Tiruu"}'::jsonb,'{"en":"Pan-fried liver with onions.","am":"ጉበት።","om":"Tiruu."}'::jsonb,0,'kitchen'::station,12,ARRAY['halal','gluten-free']::text[],true,24),
    (cid_food,'{"en":"Intestine","am":"አንጀት","om":"Mar''imaan"}'::jsonb,'{"en":"Spiced beef intestine, pan-fried.","am":"አንጀት።","om":"Mar''imaan."}'::jsonb,0,'kitchen'::station,15,ARRAY['halal']::text[],true,25),
    (cid_food,'{"en":"Beans with Bread","am":"ባቄላ በዳቦ","om":"Baqelaa Buddeena Waliin"}'::jsonb,'{"en":"Beans with Ethiopian bread.","am":"ባቄላ በዳቦ።","om":"Baqelaa Buddeena Waliin."}'::jsonb,0,'kitchen'::station,8,ARRAY['vegetarian']::text[],true,26),
    (cid_food,'{"en":"Sudanese Ful with Egg","am":"ሱዳን ፉል በእንቁላል","om":"Fuul Sudaanii Hanqaaquun"}'::jsonb,'{"en":"Sudanese fava beans with egg.","am":"ሱዳን ፉል በእንቁላል།","om":"Fuul Sudaanii Hanqaaquun."}'::jsonb,0,'kitchen'::station,10,ARRAY['vegetarian']::text[],true,27),
    (cid_food,'{"en":"Sudanese Ful without Egg","am":"ሱዳን ፉል ያለ እንቁላል","om":"Fuul Sudaanii Hanqaaquu Malee"}'::jsonb,'{"en":"Sudanese fava beans, no egg.","am":"ሱዳን ፉል ያለ እንቁላል།","om":"Fuul Sudaanii Hanqaaquu Malee."}'::jsonb,0,'kitchen'::station,8,ARRAY['vegan','fasting']::text[],true,28),
    (cid_food,'{"en":"Irish (Meat)","am":"አይሪሽ (ስጋ)","om":"Irish (Foon)"}'::jsonb,'{"en":"Potato stew with seasoned meat.","am":"አይሪሽ (ስጋ)།","om":"Irish (Foon)."}'::jsonb,0,'kitchen'::station,15,ARRAY['halal']::text[],true,29);

  -- 3b. FAST FOOD (3 items)
  INSERT INTO menu_items(category_id,name_i18n,description_i18n,price,station,avg_prep_minutes,dietary_tags,is_available,sort_order) VALUES
    (cid_fastfood,'{"en":"Irtib","am":"እርጥብ","om":"Irtib"}'::jsonb,'{"en":"Fresh soft Ethiopian bread.","am":"ኢርጥብ።","om":"Irtib."}'::jsonb,0,'kitchen'::station,5,ARRAY['vegetarian']::text[],true,1),
    (cid_fastfood,'{"en":"Special Irtib","am":"ስፔሻል እርጥብ","om":"Irtib Addaa"}'::jsonb,'{"en":"Special Irtib with extra toppings.","am":"ስፔሻል ኢርጥብ།","om":"Irtib Addaa."}'::jsonb,0,'kitchen'::station,6,ARRAY['vegetarian']::text[],true,2),
    (cid_fastfood,'{"en":"Sambusa","am":"ሳምቡሳ","om":"Sambusaa"}'::jsonb,'{"en":"Crispy pastry with lentils or meat.","am":"ሳምቡሳ།","om":"Sambusaa."}'::jsonb,0,'kitchen'::station,5,ARRAY[]::text[],true,3);

  -- 3c. HOT DRINKS (7 items)
  INSERT INTO menu_items(category_id,name_i18n,description_i18n,price,station,avg_prep_minutes,dietary_tags,is_available,sort_order) VALUES
    (cid_hotdrinks,'{"en":"Coffee","am":"ቡና","om":"Buna"}'::jsonb,'{"en":"Freshly brewed Ethiopian coffee.","am":"ቡና།","om":"Buna."}'::jsonb,0,'bar'::station,5,ARRAY['vegan','gluten-free']::text[],true,1),
    (cid_hotdrinks,'{"en":"Tea","am":"ሻይ","om":"Shaayii"}'::jsonb,'{"en":"Hot tea with or without milk.","am":"ሻይ།","om":"Shaayii."}'::jsonb,0,'bar'::station,4,ARRAY['vegan','gluten-free']::text[],true,2),
    (cid_hotdrinks,'{"en":"Milk","am":"ወተት","om":"Aannan"}'::jsonb,'{"en":"Warm or cold fresh milk.","am":"ወተት།","om":"Aannan."}'::jsonb,0,'bar'::station,3,ARRAY['vegetarian','gluten-free']::text[],true,3),
    (cid_hotdrinks,'{"en":"Ginger Tea","am":"ዝንጅብል ሻይ","om":"Shaayii Jinjibila"}'::jsonb,'{"en":"Hot tea with fresh ginger.","am":"ዝንጅብል ሻይ།","om":"Shaayii Jinjibila."}'::jsonb,0,'bar'::station,6,ARRAY['vegan','gluten-free']::text[],true,4),
    (cid_hotdrinks,'{"en":"Macchiato","am":"ማኪያቶ","om":"Maakiyaatoo"}'::jsonb,'{"en":"Ethiopian macchiato with steamed milk.","am":"ማኪያቶ།","om":"Maakiyaatoo."}'::jsonb,0,'bar'::station,4,ARRAY['vegetarian','gluten-free']::text[],true,5),
    (cid_hotdrinks,'{"en":"Lemon Tea","am":"የሎሚ ሻይ","om":"Shaayii Loomii"}'::jsonb,'{"en":"Hot tea with fresh lemon.","am":"የሎሚ ሻይ།","om":"Shaayii Loomii."}'::jsonb,0,'bar'::station,5,ARRAY['vegan','gluten-free']::text[],true,6),
    (cid_hotdrinks,'{"en":"Mango Tea","am":"የማንጎ ሻይ","om":"Shaayii Maangoo"}'::jsonb,'{"en":"Hot tea with mango flavor.","am":"የማንጎ ሻይ།","om":"Shaayii Maangoo."}'::jsonb,0,'bar'::station,5,ARRAY['vegan','gluten-free']::text[],true,7);

  -- 3d. SOFT DRINKS (6 items)
  INSERT INTO menu_items(category_id,name_i18n,description_i18n,price,station,avg_prep_minutes,dietary_tags,is_available,sort_order) VALUES
    (cid_softdrinks,'{"en":"Fanta","am":"ፋንታ","om":"Fanta"}'::jsonb,'{"en":"Chilled Fanta.","am":"ፋንታ།","om":"Fanta."}'::jsonb,0,'bar'::station,1,ARRAY['vegan','gluten-free']::text[],true,1),
    (cid_softdrinks,'{"en":"Sprite","am":"ስፕራይት","om":"Sprite"}'::jsonb,'{"en":"Chilled Sprite.","am":"ስፕራይት།","om":"Sprite."}'::jsonb,0,'bar'::station,1,ARRAY['vegan','gluten-free']::text[],true,2),
    (cid_softdrinks,'{"en":"Coca-Cola","am":"ኮካ ኮላ","om":"Coca-Cola"}'::jsonb,'{"en":"Classic Coca-Cola.","am":"ኮካ ኮላ།","om":"Coca-Cola."}'::jsonb,0,'bar'::station,1,ARRAY['vegan','gluten-free']::text[],true,3),
    (cid_softdrinks,'{"en":"Energy Drink","am":"ኢነርጂ ድሪንክ","om":"Energy Drink"}'::jsonb,'{"en":"Chilled energy drink.","am":"ኢነርጂ ድሪንክ།","om":"Energy Drink."}'::jsonb,0,'bar'::station,1,ARRAY['vegan','gluten-free']::text[],true,4),
    (cid_softdrinks,'{"en":"Water 0.5 L","am":"ውሃ 0.5 ሊትር","om":"Bishaan 0.5 Liitira"}'::jsonb,'{"en":"500ml mineral water.","am":"ውሃ 0.5 ሊትር།","om":"Bishaan 0.5 Liitira."}'::jsonb,0,'bar'::station,1,ARRAY['vegan','gluten-free']::text[],true,5),
    (cid_softdrinks,'{"en":"Water 1 L","am":"ውሃ 1 ሊትር","om":"Bishaan 1 Liitira"}'::jsonb,'{"en":"1 litre mineral water.","am":"ውሃ 1 ሊትር།","om":"Bishaan 1 Liitira."}'::jsonb,0,'bar'::station,1,ARRAY['vegan','gluten-free']::text[],true,6);

END $$;

-- Verify: should return 45 rows
SELECT c.slug AS category, m.name_i18n->>'en' AS english,
       m.name_i18n->>'am' AS amharic, m.name_i18n->>'om' AS afaan_oromo
FROM menu_items m
JOIN categories c ON c.id = m.category_id
WHERE c.is_active = true AND m.is_available = true
ORDER BY c.sort_order, m.sort_order;

NOTIFY pgrst, 'reload schema';

