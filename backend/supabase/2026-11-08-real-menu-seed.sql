-- =============================================================================
-- REAL MENU SEED — Skill Coffee, Addis Ababa
-- Replaces ALL demo menu items with the actual cafe menu in 3 languages:
--   English | Amharic | Afaan Oromo
--
-- Categories:
--   food        → Food Menu + Additional Food Menu  (sort 1)
--   fast-food   → Fast Food                         (sort 2)
--   hot-drinks  → Hot Drinks                        (sort 3)
--   soft-drinks → Soft Drinks                       (sort 4)
--
-- ⚠ Prices are set to 0 — update them in the Admin → Menu Editor afterwards.
-- Run once in the Supabase SQL Editor.
-- =============================================================================

DO $$
DECLARE
  rid            uuid;
  cid_food       uuid;
  cid_fastfood   uuid;
  cid_hotdrinks  uuid;
  cid_softdrinks uuid;
BEGIN

  -- ── 0. Resolve restaurant ─────────────────────────────────────────────────
  SELECT id INTO rid FROM restaurants WHERE slug = 'meskel-house';
  IF rid IS NULL THEN
    RAISE EXCEPTION 'Restaurant meskel-house not found. Check the slug in the restaurants table.';
  END IF;

  -- ── 1. Upsert the four real categories ───────────────────────────────────
  -- Food
  UPDATE categories
     SET name_i18n  = '{"en":"Food","am":"ምግብ","om":"Nyaata"}'::jsonb,
         sort_order = 1,
         is_active  = true
   WHERE restaurant_id = rid AND slug = 'food';
  IF NOT FOUND THEN
    INSERT INTO categories (restaurant_id, slug, name_i18n, meal_period, sort_order, is_active)
    VALUES (rid, 'food', '{"en":"Food","am":"ምግብ","om":"Nyaata"}'::jsonb, 'all_day', 1, true);
  END IF;

  -- Fast Food
  UPDATE categories
     SET name_i18n  = '{"en":"Fast Food","am":"ፈጣን ምግብ","om":"Nyaata Daddafaa"}'::jsonb,
         sort_order = 2,
         is_active  = true
   WHERE restaurant_id = rid AND slug = 'fast-food';
  IF NOT FOUND THEN
    INSERT INTO categories (restaurant_id, slug, name_i18n, meal_period, sort_order, is_active)
    VALUES (rid, 'fast-food', '{"en":"Fast Food","am":"ፈጣን ምግብ","om":"Nyaata Daddafaa"}'::jsonb, 'all_day', 2, true);
  END IF;

  -- Hot Drinks
  UPDATE categories
     SET name_i18n  = '{"en":"Hot Drinks","am":"ትኩስ መጠጦች","om":"Dhugaatii Ho''aa"}'::jsonb,
         sort_order = 3,
         is_active  = true
   WHERE restaurant_id = rid AND slug = 'hot-drinks';
  IF NOT FOUND THEN
    INSERT INTO categories (restaurant_id, slug, name_i18n, meal_period, sort_order, is_active)
    VALUES (rid, 'hot-drinks', '{"en":"Hot Drinks","am":"ትኩስ መጠጦች","om":"Dhugaatii Ho''aa"}'::jsonb, 'all_day', 3, true);
  END IF;

  -- Soft Drinks (new)
  UPDATE categories
     SET name_i18n  = '{"en":"Soft Drinks","am":"ቀዝቃዛ መጠጦች","om":"Dhugaatii Qabbanaawaa"}'::jsonb,
         sort_order = 4,
         is_active  = true
   WHERE restaurant_id = rid AND slug = 'soft-drinks';
  IF NOT FOUND THEN
    INSERT INTO categories (restaurant_id, slug, name_i18n, meal_period, sort_order, is_active)
    VALUES (rid, 'soft-drinks', '{"en":"Soft Drinks","am":"ቀዝቃዛ መጠጦች","om":"Dhugaatii Qabbanaawaa"}'::jsonb, 'all_day', 4, true);
  END IF;

  -- Deactivate old demo categories
  UPDATE categories
     SET is_active = false
   WHERE restaurant_id = rid
     AND slug IN ('coffee-drinks','milkshakes','breakfast','ethiopian-food',
                  'lunch','pizza-pasta','cocktails','desserts','coffee');

  -- Resolve IDs
  SELECT id INTO cid_food       FROM categories WHERE restaurant_id = rid AND slug = 'food';
  SELECT id INTO cid_fastfood   FROM categories WHERE restaurant_id = rid AND slug = 'fast-food';
  SELECT id INTO cid_hotdrinks  FROM categories WHERE restaurant_id = rid AND slug = 'hot-drinks';
  SELECT id INTO cid_softdrinks FROM categories WHERE restaurant_id = rid AND slug = 'soft-drinks';

  -- ── 2. Delete ALL existing menu items for this restaurant ─────────────────
  DELETE FROM menu_items
   WHERE category_id IN (SELECT id FROM categories WHERE restaurant_id = rid);

  -- ── 3a. FOOD MENU (items 1–29) ────────────────────────────────────────────
  INSERT INTO menu_items
    (category_id, name_i18n, description_i18n,
     price, station, avg_prep_minutes, dietary_tags, is_available, sort_order)
  VALUES
    (cid_food,
     '{"en":"Shiro","am":"ሽሮ","om":"Shiroo"}'::jsonb,
     '{"en":"Traditional Ethiopian chickpea stew, slow-simmered with spiced butter.","am":"ቅቤና ቅመማ ቅመም ተጨምሮ የተቀቀለ ሽሮ ወጥ።","om":"Shiroo aadaa Itoophiyaa dhadhaa mi''eessituu waliin."}'::jsonb,
     0, 'kitchen'::station, 10, ARRAY['vegan','fasting']::text[], true, 1),

    (cid_food,
     '{"en":"Tegabino","am":"ተጋቢኖ","om":"Tegabinoo"}'::jsonb,
     '{"en":"Hearty lentil or chickpea dish cooked with onions and spices.","am":"ሽንኩርትና ቅመም ተጨምሮ የተቀቀለ ምስር ምግብ።","om":"Qamadii fi shunkurtii mi''eessituu waliin bilchaate."}'::jsonb,
     0, 'kitchen'::station, 12, ARRAY['vegan','fasting']::text[], true, 2),

    (cid_food,
     '{"en":"Enkulal Firfir","am":"እንቁላል ፍርፍር","om":"Firfirii Hanqaaquu"}'::jsonb,
     '{"en":"Scrambled eggs mixed with injera, tomatoes and spices.","am":"እንቁላል ከእንጀራ፣ ቲማቲምና ቅመም ጋር ቅልቅል።","om":"Hanqaaquu buddeena, timaatimaafi mi''eessituu waliin makame."}'::jsonb,
     0, 'kitchen'::station, 10, ARRAY['vegetarian']::text[], true, 3),

    (cid_food,
     '{"en":"Spaghetti","am":"ስፓጌቲ","om":"Ispegetii"}'::jsonb,
     '{"en":"Classic spaghetti served with a rich tomato sauce.","am":"የቲማቲም ሶስ ያለው ስፓጌቲ።","om":"Ispegetii soosiisii timaatimaa waliin."}'::jsonb,
     0, 'kitchen'::station, 15, ARRAY[]::text[], true, 4),

    (cid_food,
     '{"en":"Pasta with Vegetables","am":"ፓስታ በአትክልት","om":"Paastaa Kuduraan"}'::jsonb,
     '{"en":"Pasta tossed with fresh seasonal vegetables and a light sauce.","am":"ትኩስ አትክልት ያለው ፓስታ።","om":"Paastaa kuduraalee qulqulluu waliin."}'::jsonb,
     0, 'kitchen'::station, 15, ARRAY['vegetarian']::text[], true, 5),

    (cid_food,
     '{"en":"Pasta with Meat","am":"ፓስታ በስጋ","om":"Paastaa Fooniin"}'::jsonb,
     '{"en":"Tender pasta with seasoned minced or sliced meat.","am":"ስጋ ተጨምሮ የተዘጋጀ ፓስታ።","om":"Paastaa foon mi''eeffameen waliin."}'::jsonb,
     0, 'kitchen'::station, 15, ARRAY['halal']::text[], true, 6),

    (cid_food,
     '{"en":"Ful","am":"ፉል","om":"Fuul"}'::jsonb,
     '{"en":"Mashed fava beans with olive oil, lemon and spices.","am":"ወይ ዘይት፣ ሎሚና ቅመም ያለው ፉል።","om":"Fuul baaqelaa mi''eeffame laymii fi zayitaan."}'::jsonb,
     0, 'kitchen'::station, 8, ARRAY['vegan','fasting']::text[], true, 7),

    (cid_food,
     '{"en":"Special Ful","am":"ስፔሻል ፉል","om":"Fuul Addaa"}'::jsonb,
     '{"en":"Elevated fava beans with eggs, fresh tomato and extra toppings.","am":"እንቁላልና ቲማቲም ተጨምሮ የሚቀርብ ስፔሻል ፉል።","om":"Fuul addaa hanqaaquu fi timaatimaatin mi''eeffame."}'::jsonb,
     0, 'kitchen'::station, 10, ARRAY['vegetarian']::text[], true, 8),

    (cid_food,
     '{"en":"Pasta with Egg","am":"ፓስታ በእንቁላል","om":"Paastaa Hanqaaquun"}'::jsonb,
     '{"en":"Pasta served with a fried or scrambled egg on top.","am":"ፈካ ወይም ቅልቅል እንቁላል ያለው ፓስታ።","om":"Paastaa hanqaaquu cuubame yookiin makameen."}'::jsonb,
     0, 'kitchen'::station, 12, ARRAY['vegetarian']::text[], true, 9),

    (cid_food,
     '{"en":"Chechebsa","am":"ጨጨብሳ","om":"Caccabsaa"}'::jsonb,
     '{"en":"Torn flatbread pan-crisped with spiced butter and berbere, served with honey yoghurt.","am":"የተቆራረሰ ቂጣ በንጥር ቅቤ እና በርበሬ ያለ ከእርጎ ጋር።","om":"Daabboo caccabame dhadhaa mi''aawaa fi damma waliin."}'::jsonb,
     0, 'kitchen'::station, 12, ARRAY['vegetarian']::text[], true, 10),

    (cid_food,
     '{"en":"Enkulal Sils","am":"እንቁላል ስልስ","om":"Silsii Hanqaaquu"}'::jsonb,
     '{"en":"Eggs poached in a spiced tomato and onion sauce.","am":"ቲማቲምና ሽንኩርት ሶስ ያለ እንቁላል።","om":"Hanqaaquu soosiisii timaatimaa fi shunkurtii keessatti bilchaate."}'::jsonb,
     0, 'kitchen'::station, 10, ARRAY['vegetarian']::text[], true, 11),

    (cid_food,
     '{"en":"Boiled Egg","am":"የተቀቀለ እንቁላል","om":"Hanqaaquu Bilcheefame"}'::jsonb,
     '{"en":"Hard or soft boiled eggs, served plain or with injera.","am":"ቀቅቀለ እንቁላል ብቻ ወይም ከእንጀራ ጋር።","om":"Hanqaaquu cimaa yookiin laafaan bilchaate."}'::jsonb,
     0, 'kitchen'::station, 6, ARRAY['vegetarian','gluten-free']::text[], true, 12),

    (cid_food,
     '{"en":"Rice","am":"ሩዝ","om":"Ruuzii"}'::jsonb,
     '{"en":"Steamed white rice, served plain or as a side.","am":"ቀቅቀለ ሩዝ ብቻ ወይም እንደ ጎን ምግብ።","om":"Ruuzii bilchaatee, qofaa yookiin gosa biraa waliin."}'::jsonb,
     0, 'kitchen'::station, 10, ARRAY['vegan','gluten-free']::text[], true, 13),

    (cid_food,
     '{"en":"Egg with Meat","am":"እንቁላል በስጋ","om":"Hanqaaquu Fooniin"}'::jsonb,
     '{"en":"Eggs cooked together with seasoned minced or sliced meat.","am":"ስጋ ተጨምሮ አብሮ የሚቀቀለ እንቁላል።","om":"Hanqaaquu fi foon mi''eeffameen waliin bilchaate."}'::jsonb,
     0, 'kitchen'::station, 12, ARRAY['halal']::text[], true, 14),

    (cid_food,
     '{"en":"Tomato","am":"ቲማቲም","om":"Timaatima"}'::jsonb,
     '{"en":"Fresh tomato salad or tomato-based side dish.","am":"ትኩስ ቲማቲም ሰላጣ ወይም ምግብ።","om":"Timaatima qulqulluu yookiin gosa xiqqaa."}'::jsonb,
     0, 'kitchen'::station, 5, ARRAY['vegan','gluten-free']::text[], true, 15),

    (cid_food,
     '{"en":"Egg Sandwich","am":"እንቁላል ሳንድዊች","om":"Sandwiichii Hanqaaquu"}'::jsonb,
     '{"en":"Fresh bread sandwich filled with fried or scrambled egg.","am":"የተጠበሰ ወይም ቅልቅል እንቁላል ሞልቶ ሳንድዊች።","om":"Sandwiichii hanqaaquu cuubameen yookiin makameen guutame."}'::jsonb,
     0, 'kitchen'::station, 8, ARRAY['vegetarian']::text[], true, 16),

    (cid_food,
     '{"en":"Tasty Soya","am":"ጣፋጭ ሶያ","om":"Soya Mi''aawaa"}'::jsonb,
     '{"en":"Flavorful soya-based dish cooked with spices and aromatics.","am":"ቅመም ተጨምሮ የሚቀቀለ ጣፋጭ ሶያ።","om":"Soya mi''eessituun bilchaate."}'::jsonb,
     0, 'kitchen'::station, 10, ARRAY['vegan','fasting']::text[], true, 17),

    (cid_food,
     '{"en":"Tibs","am":"ጥብስ","om":"Tibbsi"}'::jsonb,
     '{"en":"Pan-fried tender meat with onions, tomatoes and Ethiopian spices.","am":"ሽንኩርትና ቲማቲም ያለ የሚጠበስ ስጋ።","om":"Foon shunkurtii fi timaatimaafi mi''eessituu waliin sumaxame."}'::jsonb,
     0, 'kitchen'::station, 15, ARRAY['halal','gluten-free']::text[], true, 18),

    (cid_food,
     '{"en":"Duket","am":"ዱኬት","om":"Duket"}'::jsonb,
     '{"en":"Traditional spiced stew made with a mix of Ethiopian ingredients.","am":"ባህላዊ ቅመማ ቅመም ያለው ወጥ።","om":"Duket mi''eessituu aadaafi waliin."}'::jsonb,
     0, 'kitchen'::station, 15, ARRAY['halal']::text[], true, 19),

    (cid_food,
     '{"en":"Agegl","am":"አገግል","om":"Agegl"}'::jsonb,
     '{"en":"A savory Ethiopian specialty made from select ingredients.","am":"ምርጥ ቅመሞች ያሉት ባህላዊ ምግብ።","om":"Nyaata addaa Itoophiyaa."}'::jsonb,
     0, 'kitchen'::station, 15, ARRAY['halal']::text[], true, 20),

    -- Additional Food Menu
    (cid_food,
     '{"en":"Beans with Egg","am":"ባቄላ በእንቁላል","om":"Baqelaa Hanqaaquun"}'::jsonb,
     '{"en":"Cooked fava beans served with a fried or boiled egg.","am":"ፈካ ወይም ቀቅቀለ እንቁላል ያለ ባቄላ።","om":"Baqelaa bilchaate hanqaaquun waliin."}'::jsonb,
     0, 'kitchen'::station, 10, ARRAY['vegetarian']::text[], true, 21),

    (cid_food,
     '{"en":"Eggplant","am":"ኤግ ፕላንት","om":"Eggplant"}'::jsonb,
     '{"en":"Cooked eggplant dish with spices and herbs.","am":"ቅመም ተጨምሮ የሚቀቀለ ቢትርኮ ምግብ።","om":"Eggplant mi''eessituun bilchaate."}'::jsonb,
     0, 'kitchen'::station, 12, ARRAY['vegan','fasting']::text[], true, 22),

    (cid_food,
     '{"en":"Kombo","am":"ኮምቦ","om":"Komboo"}'::jsonb,
     '{"en":"A combination plate with a variety of dishes.","am":"የተለያዩ ምግቦች ቅልቅል።","om":"Nyaataalee garagaraa waliin qabate."}'::jsonb,
     0, 'kitchen'::station, 15, ARRAY[]::text[], true, 23),

    (cid_food,
     '{"en":"Liver","am":"ጉበት","om":"Tiruu"}'::jsonb,
     '{"en":"Pan-fried beef or lamb liver with onions and Ethiopian spices.","am":"ሽንኩርትና ቅመም ያለ የሚጠበስ ጉበት።","om":"Tiruu foon shunkurtii fi mi''eessituu waliin sumaxame."}'::jsonb,
     0, 'kitchen'::station, 12, ARRAY['halal','gluten-free']::text[], true, 24),

    (cid_food,
     '{"en":"Intestine","am":"አንጀት","om":"Mar''imaan"}'::jsonb,
     '{"en":"Cleaned and spiced beef intestine, pan-fried to perfection.","am":"ቅመም ያለ ንጹህ አንጀት የሚጠበስ።","om":"Mar''imaan qulqullaahe mi''eeffamee sumaxame."}'::jsonb,
     0, 'kitchen'::station, 15, ARRAY['halal']::text[], true, 25),

    (cid_food,
     '{"en":"Beans with Bread","am":"ባቄላ በዳቦ","om":"Baqelaa Buddeena Waliin"}'::jsonb,
     '{"en":"Seasoned beans served alongside fresh Ethiopian bread.","am":"ቅመም ተጨምሮ ከዳቦ ጋር ባቄላ።","om":"Baqelaa mi''eeffame buddeena Itoophiyaa waliin."}'::jsonb,
     0, 'kitchen'::station, 8, ARRAY['vegetarian']::text[], true, 26),

    (cid_food,
     '{"en":"Sudanese Ful with Egg","am":"ሱዳን ፉል በእንቁላል","om":"Fuul Sudaanii Hanqaaquun"}'::jsonb,
     '{"en":"Sudanese-style spiced fava beans topped with a boiled or fried egg.","am":"ሱዳናዊ ዘዬ ቅመም ያለው ፉል ከእንቁላል ጋር።","om":"Fuul Sudaan hanqaaquun ol-kaawame."}'::jsonb,
     0, 'kitchen'::station, 10, ARRAY['vegetarian']::text[], true, 27),

    (cid_food,
     '{"en":"Sudanese Ful without Egg","am":"ሱዳን ፉል ያለ እንቁላል","om":"Fuul Sudaanii Hanqaaquu Malee"}'::jsonb,
     '{"en":"Sudanese-style spiced fava beans, served plain without egg.","am":"ያለ እንቁላል ሱዳናዊ ዘዬ ፉል።","om":"Fuul Sudaan hanqaaquu malee."}'::jsonb,
     0, 'kitchen'::station, 8, ARRAY['vegan','fasting']::text[], true, 28),

    (cid_food,
     '{"en":"Irish (Meat)","am":"አይሪሽ (ስጋ)","om":"Irish (Foon)"}'::jsonb,
     '{"en":"Hearty Irish-style potato stew with seasoned meat.","am":"ቅመም ያለ ስጋ ተጨምሮ ድንቹ ወጥ።","om":"Dheega Irish foon mi''eeffameen waliin."}'::jsonb,
     0, 'kitchen'::station, 15, ARRAY['halal']::text[], true, 29);

  -- ── 3b. FAST FOOD (items 1–3) ─────────────────────────────────────────────
  INSERT INTO menu_items
    (category_id, name_i18n, description_i18n,
     price, station, avg_prep_minutes, dietary_tags, is_available, sort_order)
  VALUES
    (cid_fastfood,
     '{"en":"Irtib","am":"እርጥብ","om":"Irtib"}'::jsonb,
     '{"en":"Soft, fresh Ethiopian-style bread — perfect on its own or with any dish.","am":"ትኩስና ለስላሳ ኢትዮጵያዊ ዳቦ።","om":"Daabboo Itoophiyaa laafaa fi qulqulluu."}'::jsonb,
     0, 'kitchen'::station, 5, ARRAY['vegetarian']::text[], true, 1),

    (cid_fastfood,
     '{"en":"Special Irtib","am":"ስፔሻል እርጥብ","om":"Irtib Addaa"}'::jsonb,
     '{"en":"Special version of Irtib with extra toppings or fillings.","am":"ሞሞ ወይም ተጨማሪ ቅቤ ያለ ስፔሻል ኢርጥብ።","om":"Irtib addaa guutuufi gulaala biraa waliin."}'::jsonb,
     0, 'kitchen'::station, 6, ARRAY['vegetarian']::text[], true, 2),

    (cid_fastfood,
     '{"en":"Sambusa","am":"ሳምቡሳ","om":"Sambusaa"}'::jsonb,
     '{"en":"Crispy deep-fried pastry filled with spiced lentils or minced meat.","am":"ምስር ወይም ስጋ ሞልቶ የሚቆሰቆሰው ሳምቡሳ።","om":"Sambusaa qooqqa keessaa fi mi''eessituun guutame."}'::jsonb,
     0, 'kitchen'::station, 5, ARRAY[]::text[], true, 3);

  -- ── 3c. HOT DRINKS (items 1–7) ────────────────────────────────────────────
  INSERT INTO menu_items
    (category_id, name_i18n, description_i18n,
     price, station, avg_prep_minutes, dietary_tags, is_available, sort_order)
  VALUES
    (cid_hotdrinks,
     '{"en":"Coffee","am":"ቡና","om":"Buna"}'::jsonb,
     '{"en":"Freshly brewed Ethiopian coffee served hot.","am":"ትኩስ ቡና።","om":"Buna Itoophiyaa ho''aa."}'::jsonb,
     0, 'bar'::station, 5, ARRAY['vegan','gluten-free']::text[], true, 1),

    (cid_hotdrinks,
     '{"en":"Tea","am":"ሻይ","om":"Shaayii"}'::jsonb,
     '{"en":"Classic hot tea served with or without milk.","am":"ወተት ያለ ወይም ያለ ሻይ።","om":"Shaayii ho''aa aannan waliin yookiin malee."}'::jsonb,
     0, 'bar'::station, 4, ARRAY['vegan','gluten-free']::text[], true, 2),

    (cid_hotdrinks,
     '{"en":"Milk","am":"ወተት","om":"Aannan"}'::jsonb,
     '{"en":"Warm or cold fresh milk.","am":"ትኩስ ወይም ቀዝቃዛ ወተት።","om":"Aannan ho''aa yookiin qabbanaawaa."}'::jsonb,
     0, 'bar'::station, 3, ARRAY['vegetarian','gluten-free']::text[], true, 3),

    (cid_hotdrinks,
     '{"en":"Ginger Tea","am":"ዝንጅብል ሻይ","om":"Shaayii Jinjibila"}'::jsonb,
     '{"en":"Aromatic hot tea brewed with fresh ginger root.","am":"ትኩስ ዝንጅብል ያለ ሻይ።","om":"Shaayii jinjibila qulqulluu waliin ho''aan qophaahe."}'::jsonb,
     0, 'bar'::station, 6, ARRAY['vegan','gluten-free']::text[], true, 4),

    (cid_hotdrinks,
     '{"en":"Macchiato","am":"ማኪያቶ","om":"Maakiyaatoo"}'::jsonb,
     '{"en":"Ethiopian-style espresso topped with a splash of steamed milk.","am":"ወተት ክሬም ያለ ኢትዮጵያዊ ማኪያቶ።","om":"Maakiyaatoo Itoophiyaa aannan ho''aa xinnoo waliin."}'::jsonb,
     0, 'bar'::station, 4, ARRAY['vegetarian','gluten-free']::text[], true, 5),

    (cid_hotdrinks,
     '{"en":"Lemon Tea","am":"የሎሚ ሻይ","om":"Shaayii Loomii"}'::jsonb,
     '{"en":"Hot tea with a bright squeeze of fresh lemon.","am":"ትኩስ ሎሚ ያለ ሻይ።","om":"Shaayii ho''aa loomii qulqulluu waliin."}'::jsonb,
     0, 'bar'::station, 5, ARRAY['vegan','gluten-free']::text[], true, 6),

    (cid_hotdrinks,
     '{"en":"Mango Tea","am":"የማንጎ ሻይ","om":"Shaayii Maangoo"}'::jsonb,
     '{"en":"Fragrant hot tea with mango flavor or fresh mango pieces.","am":"ማንጎ ጣዕም ያለ ሻይ።","om":"Shaayii ho''aa maangoo mi''eeffamee."}'::jsonb,
     0, 'bar'::station, 5, ARRAY['vegan','gluten-free']::text[], true, 7);

  -- ── 3d. SOFT DRINKS (items 1–6) ───────────────────────────────────────────
  INSERT INTO menu_items
    (category_id, name_i18n, description_i18n,
     price, station, avg_prep_minutes, dietary_tags, is_available, sort_order)
  VALUES
    (cid_softdrinks,
     '{"en":"Fanta","am":"ፋንታ","om":"Fanta"}'::jsonb,
     '{"en":"Chilled Fanta orange or other flavors.","am":"ቀዝቃዛ ፋንታ።","om":"Fanta qabbanaawaa."}'::jsonb,
     0, 'bar'::station, 1, ARRAY['vegan','gluten-free']::text[], true, 1),

    (cid_softdrinks,
     '{"en":"Sprite","am":"ስፕራይት","om":"Sprite"}'::jsonb,
     '{"en":"Refreshing lemon-lime Sprite soda, served chilled.","am":"ቀዝቃዛ ስፕራይት።","om":"Sprite qabbanaawaa loomii-laymii."}'::jsonb,
     0, 'bar'::station, 1, ARRAY['vegan','gluten-free']::text[], true, 2),

    (cid_softdrinks,
     '{"en":"Coca-Cola","am":"ኮካ ኮላ","om":"Coca-Cola"}'::jsonb,
     '{"en":"Classic Coca-Cola served ice cold.","am":"ቀዝቃዛ ኮካ ኮላ።","om":"Coca-Cola qabbanaawaa baramaa."}'::jsonb,
     0, 'bar'::station, 1, ARRAY['vegan','gluten-free']::text[], true, 3),

    (cid_softdrinks,
     '{"en":"Energy Drink","am":"ኢነርጂ ድሪንክ","om":"Energy Drink"}'::jsonb,
     '{"en":"Chilled energy drink to boost your day.","am":"ቀዝቃዛ ኢነርጂ ድሪንክ።","om":"Dhugaatii energy qabbanaawaa."}'::jsonb,
     0, 'bar'::station, 1, ARRAY['vegan','gluten-free']::text[], true, 4),

    (cid_softdrinks,
     '{"en":"Water 0.5 L","am":"ውሃ 0.5 ሊትር","om":"Bishaan 0.5 Liitira"}'::jsonb,
     '{"en":"500 ml chilled mineral water bottle.","am":"500 ሚሊ ሊትር ቀዝቃዛ ውሃ።","om":"Bishaan madani 500 ml qabbanaawaa."}'::jsonb,
     0, 'bar'::station, 1, ARRAY['vegan','gluten-free']::text[], true, 5),

    (cid_softdrinks,
     '{"en":"Water 1 L","am":"ውሃ 1 ሊትር","om":"Bishaan 1 Liitira"}'::jsonb,
     '{"en":"1 litre chilled mineral water bottle.","am":"1 ሊትር ቀዝቃዛ ውሃ።","om":"Bishaan madani 1 liitira qabbanaawaa."}'::jsonb,
     0, 'bar'::station, 1, ARRAY['vegan','gluten-free']::text[], true, 6);

END $$;

-- ── Verification queries ──────────────────────────────────────────────────────

-- Category summary
SELECT
  c.slug,
  c.name_i18n->>'en'  AS name_en,
  c.name_i18n->>'am'  AS name_am,
  c.name_i18n->>'om'  AS name_om,
  c.sort_order,
  COUNT(m.id)          AS items
FROM categories c
LEFT JOIN menu_items m ON m.category_id = c.id
WHERE c.is_active = true
  AND c.restaurant_id = (SELECT id FROM restaurants WHERE slug = 'meskel-house')
GROUP BY c.id, c.slug, c.name_i18n, c.sort_order
ORDER BY c.sort_order;

-- All items in all 3 languages
SELECT
  c.slug           AS category,
  m.sort_order,
  m.name_i18n->>'en'  AS english,
  m.name_i18n->>'am'  AS amharic,
  m.name_i18n->>'om'  AS afaan_oromo
FROM menu_items m
JOIN categories c ON c.id = m.category_id
WHERE c.is_active = true
ORDER BY c.sort_order, m.sort_order;

NOTIFY pgrst, 'reload schema';
