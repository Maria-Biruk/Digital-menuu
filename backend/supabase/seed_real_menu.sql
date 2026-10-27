-- Generated from lib/mock.ts by scripts/make-seed.ts. Replaces the demo menu.
do $$
declare rid uuid;
begin
  select id into rid from restaurants where slug = 'meskel-house';
  if rid is null then raise exception 'restaurant % not found', 'meskel-house'; end if;

  delete from menu_items;
  delete from categories;
  delete from payment_accounts;

  insert into categories (restaurant_id, slug, name_i18n, meal_period, sort_order) values
    (rid, 'coffee-drinks', '{"en":"Coffee & Drinks","am":"ቡና እና መጠጦች","om":"Buna fi Dhugaatii"}'::jsonb, 'all_day', 1),
    (rid, 'milkshakes', '{"en":"Milkshakes","am":"ሚልክሼኮች","om":"Miilkisheekii"}'::jsonb, 'all_day', 2),
    (rid, 'breakfast', '{"en":"Breakfast","am":"ቁርስ","om":"Ciree"}'::jsonb, 'breakfast', 3),
    (rid, 'ethiopian-food', '{"en":"Ethiopian Food","am":"የኢትዮጵያ ምግብ","om":"Nyaata Itoophiyaa"}'::jsonb, 'all_day', 4),
    (rid, 'lunch', '{"en":"Lunch & Dinner","am":"ምሳ እና እራት","om":"Laaqana"}'::jsonb, 'all_day', 5),
    (rid, 'pizza-pasta', '{"en":"Pizza & Pasta","am":"ፒዛ እና ፓስታ","om":"Piizaa fi Paastaa"}'::jsonb, 'all_day', 6),
    (rid, 'cocktails', '{"en":"Cocktails","am":"ኮክቴሎች","om":"Kookteelii"}'::jsonb, 'all_day', 7),
    (rid, 'desserts', '{"en":"Desserts","am":"ጣፋጭ ምግቦች","om":"Mi''aawaa"}'::jsonb, 'all_day', 8);

  insert into menu_items (category_id, name_i18n, description_i18n, price, image_path, station,
    avg_prep_minutes, calories, ingredients, dietary_tags, tag, rating, is_available, sort_order)
  values (
    (select id from categories where restaurant_id = rid and slug = 'coffee-drinks'),
    '{"en":"Hot Chocolate","am":"ትኩስ ቸኮሌት","om":"Hot Chocolate"}'::jsonb,
    '{"en":"Rich velvety steamed milk infused with premium melted Belgian cocoa, topped with marshmallow cloud cream and dark chocolate curls.","am":"በጥራት ከተመረጠ የቤልጂየም ቸኮሌት እና ከወተት የተዘጋጀ ጣፋጭ ትኩስ ቸኮሌት።","om":"Hot chocolate mi’aawaa aannan fi chokoleetii qulqulluu irraa tolfame."}'::jsonb,
    200, 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=800&auto=format&fit=crop&q=80', 'bar'::station,
    6, 340, array['Belgian Dark Cocoa', 'Whole Steamed Milk', 'Vanilla Bean', 'Marshmallows', 'Chocolate Curls']::text[], array['vegetarian']::text[],
    'Popular', 4.9, true, 1);

  insert into menu_items (category_id, name_i18n, description_i18n, price, image_path, station,
    avg_prep_minutes, calories, ingredients, dietary_tags, tag, rating, is_available, sort_order)
  values (
    (select id from categories where restaurant_id = rid and slug = 'coffee-drinks'),
    '{"en":"Espresso Coffee","am":"ኤስፕሬሶ ቡና","om":"Espresso Buna"}'::jsonb,
    '{"en":"Double shot of freshly roasted single-origin Ethiopian Sidama Arabica beans extracted under optimal pressure with golden tiger crema.","am":"ከይርጋጨፌ እና ከሲዳማ የተመረጠ ጠንካራና ጥሩ መዓዛ ያለው ባለ ሁለት ሾት ኤስፕሬሶ።","om":"Espresso cimaa buna biyya keessaa adda ta’e irraa tolfame."}'::jsonb,
    120, 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=800&auto=format&fit=crop&q=80', 'bar'::station,
    4, 5, array['100% Ethiopian Sidama Specialty Arabica Beans', 'Filtered Mountain Water']::text[], array['vegan', 'gluten-free']::text[],
    'Best Seller', 4.9, true, 2);

  insert into menu_items (category_id, name_i18n, description_i18n, price, image_path, station,
    avg_prep_minutes, calories, ingredients, dietary_tags, tag, rating, is_available, sort_order)
  values (
    (select id from categories where restaurant_id = rid and slug = 'coffee-drinks'),
    '{"en":"Mocha Coffee","am":"ሞካ ቡና","om":"Mocha Buna"}'::jsonb,
    '{"en":"Signature espresso layered with bittersweet dark chocolate ganache, silky steamed milk, finished with dusting of Dutch cocoa.","am":"ኤስፕሬሶ ከጣፋጭ ቸኮሌት እና ከወተት ክሬም ጋር ተቀላቅሎ የሚቀርብ ሞካ።","om":"Mocha mi’aawaa buna espresso fi chokoleetii mi’aawaa waliin."}'::jsonb,
    220, 'https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?w=800&auto=format&fit=crop&q=80', 'bar'::station,
    6, 310, array['Espresso Roast', 'Artisan Chocolate Ganache', 'Steamed Milk', 'Dutch Cocoa Dust']::text[], array['vegetarian']::text[],
    'Popular', 4.9, true, 3);

  insert into menu_items (category_id, name_i18n, description_i18n, price, image_path, station,
    avg_prep_minutes, calories, ingredients, dietary_tags, tag, rating, is_available, sort_order)
  values (
    (select id from categories where restaurant_id = rid and slug = 'coffee-drinks'),
    '{"en":"Lata Coffee (Caffè Latte)","am":"ላቴ ቡና","om":"Laattee Buna"}'::jsonb,
    '{"en":"Smooth shot of freshly pulled espresso topped with delicately textured whole milk and hand-poured artisan rosette latte art.","am":"የለሰለሰ ኤስፕሬሶ ከተመጠነ የሞቀ ወተት ክሬም ጋር በባለሙያ የተዘጋጀ ላቴ።","om":"Laattee lallaafaa buna fi aannan ho’aa mi’aawaa irraa tolfame."}'::jsonb,
    180, 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=800&auto=format&fit=crop&q=80', 'bar'::station,
    5, 190, array['Specialty Espresso', 'Fresh Whole Milk', 'Microfoam Texture']::text[], array['vegetarian']::text[],
    null, 4.8, true, 4);

  insert into menu_items (category_id, name_i18n, description_i18n, price, image_path, station,
    avg_prep_minutes, calories, ingredients, dietary_tags, tag, rating, is_available, sort_order)
  values (
    (select id from categories where restaurant_id = rid and slug = 'coffee-drinks'),
    '{"en":"Ethiopian Buna (Ceremonial)","am":"የኢትዮጵያ ባህላዊ ቡና","om":"Buna Aadaa Itoophiyaa"}'::jsonb,
    '{"en":"Freshly clay-pot roasted Yirgacheffe single-origin Arabica coffee brewed in a traditional clay jebena, served with frankincense smoke & popcorn.","am":"በትኩሱ የተቆላና በጀበና የፈላ የይርጋጨፌ ቡና ከእጣንና ፈንዲሻ ጋር።","om":"Buna Yirgacheffe jabanaadhaan qophaa’e aara ixaana fi fandiishaa waliin."}'::jsonb,
    90, 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80', 'bar'::station,
    10, 5, array['Yirgacheffe Single-Origin Green Beans', 'Spring Water', 'Frankincense', 'Fresh Popcorn']::text[], array['vegan', 'gluten-free']::text[],
    'Chef''s Choice', 5, true, 5);

  insert into menu_items (category_id, name_i18n, description_i18n, price, image_path, station,
    avg_prep_minutes, calories, ingredients, dietary_tags, tag, rating, is_available, sort_order)
  values (
    (select id from categories where restaurant_id = rid and slug = 'coffee-drinks'),
    '{"en":"Passion Fruit Juice","am":"የፓሽን ፍሩት ጁስ","om":"Juusii Paashinii"}'::jsonb,
    '{"en":"Cold-pressed tart and aromatic tropical passion fruit nectar sweetened with wild Ethiopian highland honey.","am":"ተፈጥሯዊና ትኩስ የፓሽን ፍሩት ጁስ ከደጋ ማር ጋር።","om":"Juusii firii paashinii qabbanaawaa damma uumamaatiin mi’eeffame."}'::jsonb,
    130, 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&auto=format&fit=crop&q=80', 'bar'::station,
    5, 120, array['Fresh Passion Fruit Nectar', 'Ethiopian Highland Honey', 'Crushed Ice']::text[], array['vegan', 'gluten-free']::text[],
    null, 4.7, true, 6);

  insert into menu_items (category_id, name_i18n, description_i18n, price, image_path, station,
    avg_prep_minutes, calories, ingredients, dietary_tags, tag, rating, is_available, sort_order)
  values (
    (select id from categories where restaurant_id = rid and slug = 'milkshakes'),
    '{"en":"Biscoff Milkshakes","am":"ቢስኮፍ ሚልክሼክ","om":"Biscoff Miilkisheekii"}'::jsonb,
    '{"en":"Creamy Madagascar vanilla bean gelato blended with spiced Lotus Biscoff cookie butter, topped with whipped cream, crunchy biscuit crumbs, and warm speculoos drizzle.","am":"ከቫኒላ አይስክሬም እና ከሎተስ ቢስኮፍ ኩኪስ ክሬም ጋር የተዘጋጀ ምርጥ ሚልክሼክ።","om":"Miilkisheekii addaa Lotus Biscoff fi ayiskiriimii vaniilaa irraa tolfame."}'::jsonb,
    200, 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=800&auto=format&fit=crop&q=80', 'bar'::station,
    7, 580, array['Lotus Biscoff Spread', 'Vanilla Gelato', 'Whole Cream Milk', 'Speculoos Biscuits', 'Whipped Cream']::text[], array['vegetarian']::text[],
    'Popular', 4.9, true, 1);

  insert into menu_items (category_id, name_i18n, description_i18n, price, image_path, station,
    avg_prep_minutes, calories, ingredients, dietary_tags, tag, rating, is_available, sort_order)
  values (
    (select id from categories where restaurant_id = rid and slug = 'milkshakes'),
    '{"en":"Salted Caramel Milkshakes","am":"ሶልትድ ካራሜል ሚልክሼክ","om":"Salted Caramel Miilkisheekii"}'::jsonb,
    '{"en":"Decadent hand-churned caramel shake swirled with artisanal fleur de sel salted caramel sauce, topped with toasted toffee crunch and gold sugar dust.","am":"በጨዋማ ካራሜልና በአይስክሬም ተዘጋጅቶ በቶፊ ክራንች የተሸለመ የሚያምር ሚልክሼክ።","om":"Miilkisheekii caramel mi’aawaa fi sogidda xiqqoo waliin lallaafaa."}'::jsonb,
    200, 'https://images.unsplash.com/photo-1579954115545-a95591f28bfc?w=800&auto=format&fit=crop&q=80', 'bar'::station,
    7, 540, array['Salted Butter Caramel', 'Fleur de Sel', 'Custard Ice Cream', 'Toffee Bits', 'Chantilly Cream']::text[], array['vegetarian']::text[],
    'Popular', 4.8, true, 2);

  insert into menu_items (category_id, name_i18n, description_i18n, price, image_path, station,
    avg_prep_minutes, calories, ingredients, dietary_tags, tag, rating, is_available, sort_order)
  values (
    (select id from categories where restaurant_id = rid and slug = 'milkshakes'),
    '{"en":"Decadent Chocolate Milkshakes","am":"ዴካደንት ቸኮሌት ሚልክሼክ","om":"Decadent Chokoleetii Miilkisheekii"}'::jsonb,
    '{"en":"Double dark chocolate gelato churned with hot fudge chocolate ganache, brownie crumbles, chocolate syrup drizzle, and mini chocolate pearls.","am":"በጣም ጣፋጭና በቸኮሌት ብራውኒ የተሞላ ደማቅ የቸኮሌት ሚልክሼክ።","om":"Miilkisheekii chokoleetii hedduu mi’aawaa baay’ee jaalatamu."}'::jsonb,
    200, 'https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?w=800&auto=format&fit=crop&q=80', 'bar'::station,
    8, 620, array['Dark Chocolate Gelato', 'Fudge Ganache', 'Brownie Bites', 'Chocolate Shavings', 'Heavy Cream']::text[], array['vegetarian']::text[],
    'Best Seller', 5, true, 3);

  insert into menu_items (category_id, name_i18n, description_i18n, price, image_path, station,
    avg_prep_minutes, calories, ingredients, dietary_tags, tag, rating, is_available, sort_order)
  values (
    (select id from categories where restaurant_id = rid and slug = 'milkshakes'),
    '{"en":"Chocolate Milkshakes","am":"ቸኮሌት ሚልክሼክ","om":"Chokoleetii Miilkisheekii"}'::jsonb,
    '{"en":"Classic ultra-thick creamy chocolate shake made with whole milk ice cream, Hershey style cocoa syrup, whipped cream, and chocolate wafer straw.","am":"ባህላዊውና ተወዳጁ ወፍራም የቸኮሌት ሚልክሼክ ከዋፈር ጋር።","om":"Miilkisheekii chokoleetii baramaa fi qabbanaawaa."}'::jsonb,
    200, 'https://images.unsplash.com/photo-1568909344668-6f14a07b56a0?w=800&auto=format&fit=crop&q=80', 'bar'::station,
    6, 490, array['Dutch Cocoa Ice Cream', 'Chocolate Syrup', 'Whole Milk', 'Crispy Wafer Straw']::text[], array['vegetarian']::text[],
    null, 4.7, true, 4);

  insert into menu_items (category_id, name_i18n, description_i18n, price, image_path, station,
    avg_prep_minutes, calories, ingredients, dietary_tags, tag, rating, is_available, sort_order)
  values (
    (select id from categories where restaurant_id = rid and slug = 'ethiopian-food'),
    '{"en":"Doro Wat Platter","am":"ዶሮ ወጥ","om":"Kukkuu Doro Wot"}'::jsonb,
    '{"en":"Traditional slow-cooked chicken drumsticks simmered in rich berbere sauce with hard-boiled eggs and fresh teff injera.","am":"በበርበሬና በቅመማ ቅመም የበሰለ ባህላዊ የዶሮ ወጥ ከእንቁላልና ከእንጀራ ጋር።","om":"Kukkuu doro mi’eessituu baramaatiin bilchaate kan hanqaaquu fi buddenaan dhiyaatu."}'::jsonb,
    450, 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80', 'kitchen'::station,
    25, 780, array['Tender Chicken Drumsticks', 'Organic Berbere Spice', 'Niter Kibbeh (Clarified Spiced Butter)', 'Hard-Boiled Egg', 'Teff Injera', 'Ayib Cheese']::text[], array['halal', 'spicy']::text[],
    'Popular', 4.9, true, 1);

  insert into menu_items (category_id, name_i18n, description_i18n, price, image_path, station,
    avg_prep_minutes, calories, ingredients, dietary_tags, tag, rating, is_available, sort_order)
  values (
    (select id from categories where restaurant_id = rid and slug = 'ethiopian-food'),
    '{"en":"Beyaynetu Vegan Platter","am":"በያይነቱ","om":"Beyaynetuu"}'::jsonb,
    '{"en":"A colorful platter of traditional fasting stews: shiro, misir wot, gomen, atkilt, and spicy beetroot salad on injera.","am":"የተለያዩ የፆም ወጦች ቅልቅል፡ ሽሮ፣ ምስር፣ ጎመን እና አትክልት ከትኩስ እንጀራ ጋር።","om":"Qophii soomaa mi’aawaa: shiroo, misira, gomenii fi fuduraalee waliin."}'::jsonb,
    320, 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&auto=format&fit=crop&q=80', 'kitchen'::station,
    15, 620, array['Misir Wot (Red Lentils)', 'Kik Alicha (Yellow Split Peas)', 'Gomen (Collard Greens)', 'Atkilt (Cabbage & Carrots)', 'Shiro Wot', 'Teff Injera']::text[], array['vegan', 'vegetarian', 'fasting']::text[],
    'New', 4.8, true, 2);

  insert into menu_items (category_id, name_i18n, description_i18n, price, image_path, station,
    avg_prep_minutes, calories, ingredients, dietary_tags, tag, rating, is_available, sort_order)
  values (
    (select id from categories where restaurant_id = rid and slug = 'ethiopian-food'),
    '{"en":"Special Beef Tibs","am":"የበሬ ጥብስ","om":"Tibsii Foon Loowanii"}'::jsonb,
    '{"en":"Pan-seared tender beef cubes tossed with rosemary, sweet red onions, garlic, and fresh green jalapeños on a sizzling clay skillet.","am":"የለሰለሰ የበሬ ሥጋ በሽንኩርት፣ ቃሪያ እና ሮዝመሪ የተጠበሰ።","om":"Foon loowanii laafaa shunkurtii, qullubbii fi qaaraa waliin waxalame."}'::jsonb,
    380, 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?w=800&auto=format&fit=crop&q=80', 'kitchen'::station,
    18, 720, array['Prime Tender Beef Cubes', 'Rosemary Sprigs', 'Red Onions', 'Garlic', 'Green Jalapeños', 'Niter Kibbeh', 'Fresh Injera']::text[], array['halal', 'gluten-free', 'spicy']::text[],
    'Chef''s Choice', 4.9, true, 3);

  insert into menu_items (category_id, name_i18n, description_i18n, price, image_path, station,
    avg_prep_minutes, calories, ingredients, dietary_tags, tag, rating, is_available, sort_order)
  values (
    (select id from categories where restaurant_id = rid and slug = 'breakfast'),
    '{"en":"Traditional Chechebsa","am":"ጨጨብሳ (ቂጣ ፍርፍር)","om":"Caccabsaa"}'::jsonb,
    '{"en":"Torn pieces of pan-baked flatbread glazed with spiced clarified butter (kibe) and berbere sauce, served with honey yoghurt.","am":"የተቆራረሰ ቂጣ በንጥር ቅቤ እና በርበሬ የተለወሰ ከእርጎ ጋር የሚቀርብ።","om":"Daabboo xiqqaatee qophaa’e kan dhadhaa mi’aawaa fi damma waliin makame."}'::jsonb,
    240, 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&auto=format&fit=crop&q=80', 'kitchen'::station,
    12, 540, array['Handmade Kita Flatbread', 'Niter Kibbeh (Clarified Butter)', 'Berbere Spice Blend', 'Natural Yoghurt', 'Wild Honey']::text[], array['vegetarian']::text[],
    null, 4.8, true, 1);

  insert into menu_items (category_id, name_i18n, description_i18n, price, image_path, station,
    avg_prep_minutes, calories, ingredients, dietary_tags, tag, rating, is_available, sort_order)
  values (
    (select id from categories where restaurant_id = rid and slug = 'lunch'),
    '{"en":"Kitfo Special","am":"ክትፎ ስፔሻል","om":"Kitfoo Addaa"}'::jsonb,
    '{"en":"Prime minced lean beef warmed in herb-infused nitir qibe and mitmita, served with ayib cheese, kocho, and gomen kitfo.","am":"የተመረጠ ቀይ የበሬ ሥጋ በሚጥሚጣና በንጥር ቅቤ ተለውሶ ከአይብና ከጎመን ጋር።","om":"Foon daakame dhangaggaawaa dhadhaa qulqulluu fi aayibii aadaatiin qophaa’e."}'::jsonb,
    490, 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&auto=format&fit=crop&q=80', 'kitchen'::station,
    15, 810, array['Prime Minced Lean Beef', 'Mitmita Hot Chili', 'Spiced Butter (Qibe)', 'Ayib Cottage Cheese', 'Steamed Gomen', 'Kocho']::text[], array['halal', 'gluten-free', 'spicy']::text[],
    'Best Seller', 4.9, true, 1);

  insert into menu_items (category_id, name_i18n, description_i18n, price, image_path, station,
    avg_prep_minutes, calories, ingredients, dietary_tags, tag, rating, is_available, sort_order)
  values (
    (select id from categories where restaurant_id = rid and slug = 'pizza-pasta'),
    '{"en":"Margherita Pizza","am":"ማርገሪታ ፒዛ","om":"Margherita Piizaa"}'::jsonb,
    '{"en":"Artisan hand-stretched sourdough crust with San Marzano tomato pomodoro, creamy fior di latte mozzarella, and fresh sweet basil.","am":"በእጅ የተቦካ ትኩስ ፒዛ ከሞዛሬላ አይብ፣ ቲማቲም እና ባዝል ቅጠል ጋር።","om":"Piizaa aadaa xaaliyaanii timaatima, mozzaarellaa fi baazilii qulqulluu waliin."}'::jsonb,
    360, 'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?w=800&auto=format&fit=crop&q=80', 'kitchen'::station,
    20, 690, array['Fermented Sourdough Dough', 'San Marzano Tomato Sauce', 'Fresh Fior di Latte Mozzarella', 'Sweet Basil Leaves', 'Extra Virgin Olive Oil']::text[], array['vegetarian']::text[],
    null, 4.7, true, 1);

  insert into menu_items (category_id, name_i18n, description_i18n, price, image_path, station,
    avg_prep_minutes, calories, ingredients, dietary_tags, tag, rating, is_available, sort_order)
  values (
    (select id from categories where restaurant_id = rid and slug = 'pizza-pasta'),
    '{"en":"Truffle Mushroom Pasta","am":"ትራፍል ፓስታ","om":"Truffle Paastaa"}'::jsonb,
    '{"en":"Fresh tagliatelle tossed in decadent black truffle cream reduction, roasted wild mushrooms, and aged Parmigiano Reggiano.","am":"በክሬም እና ትራፍል ሶስ የተዘጋጀ ትኩስ ፓስታ ከእንጉዳይና ፓርሜዛን አይብ ጋር።","om":"Paastaa mi’aawaa kirimii truffle, boombii fi paarmeezaanii waliin."}'::jsonb,
    420, 'https://images.unsplash.com/photo-1621996346565-e3d5d6281223?w=800&auto=format&fit=crop&q=80', 'kitchen'::station,
    18, 740, array['Fresh Tagliatelle Pasta', 'Black Truffle Oil', 'Wild Forest Mushrooms', 'Double Cream', 'Aged Parmigiano Reggiano', 'Flat Leaf Parsley']::text[], array['vegetarian']::text[],
    'Popular', 4.8, true, 2);

  insert into menu_items (category_id, name_i18n, description_i18n, price, image_path, station,
    avg_prep_minutes, calories, ingredients, dietary_tags, tag, rating, is_available, sort_order)
  values (
    (select id from categories where restaurant_id = rid and slug = 'desserts'),
    '{"en":"Baklava Pistachio","am":"ባክላቫ","om":"Baqlaawaa"}'::jsonb,
    '{"en":"Crisp layers of delicate golden phyllo pastry filled with chopped roasted pistachios and walnuts, steeped in floral orange-blossom honey syrup.","am":"በማርና በለውዝ የተሞላ ቀጭንና ጣፋጭ የባክላቫ ኬክ።","om":"Mi’aawaa baqlaawaa damma fi loozii mi’aawaa qabate."}'::jsonb,
    180, 'https://images.unsplash.com/photo-1519869325930-281384150729?w=800&auto=format&fit=crop&q=80', 'kitchen'::station,
    8, 320, array['Butter Glazed Phyllo Pastry', 'Roasted Antep Pistachios', 'Crushed Walnuts', 'Orange Blossom Water', 'Pure Highland Honey']::text[], array['vegetarian']::text[],
    null, 4.8, true, 1);

  insert into menu_items (category_id, name_i18n, description_i18n, price, image_path, station,
    avg_prep_minutes, calories, ingredients, dietary_tags, tag, rating, is_available, sort_order)
  values (
    (select id from categories where restaurant_id = rid and slug = 'cocktails'),
    '{"en":"House Tej (Honey Wine)","am":"የቤት ጠጅ (የማር ወይን)","om":"Daadhii Dammaa (Tej)"}'::jsonb,
    '{"en":"Authentic fermented Ethiopian mead made from wild flora honey and gesho hops, served in a traditional glass berele.","am":"ከተመረጠ ማርና ጌሾ የተዘጋጀ ጥንታዊ ባህላዊ የብርሌ ጠጅ።","om":"Daadhii dammaa aadaa bareeda birilleedhaan dhiyaatu."}'::jsonb,
    190, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&auto=format&fit=crop&q=80', 'bar'::station,
    5, 150, array['Raw Wildflower Honey', 'Fermented Gesho Leaves', 'Purified Water']::text[], array['gluten-free']::text[],
    null, 4.8, true, 1);

  insert into menu_items (category_id, name_i18n, description_i18n, price, image_path, station,
    avg_prep_minutes, calories, ingredients, dietary_tags, tag, rating, is_available, sort_order)
  values (
    (select id from categories where restaurant_id = rid and slug = 'cocktails'),
    '{"en":"Hibiscus Gin Cocktail","am":"ሃይቢስከስ ጂን ኮክቴል","om":"Hibiscus Gin Kookteelii"}'::jsonb,
    '{"en":"Botanical artisan gin shaken with steeped ruby hibiscus karkadeh cordial, fresh lime juice, and sparkling soda with edible petals.","am":"የሃይቢስከስ አበባ፣ የሎሚ ጁስ እና ጂን ቅልቅል የሚያምር ኮክቴል።","om":"Kookteelii gin fi daraaraa hibiscus qabbanaawaa mi’eessituu addaatiin."}'::jsonb,
    280, 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&auto=format&fit=crop&q=80', 'bar'::station,
    7, 190, array['Dry Botanical Gin', 'Steeped Hibiscus Karkadeh', 'Fresh Lime Juice', 'Simple Syrup', 'Sparkling Club Soda']::text[], array['gluten-free']::text[],
    null, 4.9, true, 2);

  insert into payment_accounts (restaurant_id, account_type, label, account_name, account_number, phone_number, is_active) values
    (rid, 'bank', 'Commercial Bank of Ethiopia (CBE)', 'Skill Coffee Hospitality PLC', '1000123456789', null, true),
    (rid, 'bank', 'Awash International Bank', 'Skill Coffee Hospitality PLC', '0132087654321', null, true),
    (rid, 'telebirr', 'Telebirr SuperApp Pay', 'Skill Coffee Dining', null, '+251 91 123 4567', true);
end $$;

select (select count(*) from categories) as categories,
       (select count(*) from menu_items) as menu_items,
       (select count(*) from payment_accounts) as payment_accounts;
