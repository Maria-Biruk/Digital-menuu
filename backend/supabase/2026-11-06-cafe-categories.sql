-- ============================================================================
-- Cafe category structure: Food / Fast Food / Coffee / Hot Drinks.
--
-- Nothing is deleted: every existing item is rebucketed into the four real
-- cafe categories, the old categories are deactivated (so they disappear from
-- the menu but history/analytics keep their references). Items can be moved
-- later from the Menu Editor.
--
-- Mapping applied:
--   Coffee      <- espresso / lata / mocha / ceremonial buna, + milkshakes
--   Hot Drinks  <- hot chocolate, juices, tej, hibiscus/cocktails
--   Food        <- Ethiopian dishes, breakfast, lunch & dinner, pizza & pasta
--   Fast Food   <- desserts / grab-and-go (add burgers & sandwiches here)
--
-- Run this once in the Supabase SQL Editor. Idempotent.
-- ============================================================================

do $$
declare
  rid            uuid;
  cid_food       uuid;
  cid_fastfood   uuid;
  cid_coffee     uuid;
  cid_hotdrinks  uuid;
begin
  select id into rid from restaurants where slug = 'meskel-house';
  if rid is null then raise exception 'restaurant meskel-house not found'; end if;

  -- 1. Create (or refresh) the four cafe categories.
  insert into categories (restaurant_id, slug, name_i18n, meal_period, sort_order, is_active)
  select rid, v.slug, v.name, 'all_day', v.ord, true
    from (values
      ('food',      '{"en":"Food","am":"ምግብ","om":"Nyaata"}'::jsonb, 1),
      ('fast-food', '{"en":"Fast Food","am":"ፈጣን ምግብ","om":"Nyaata Dqqaa"}'::jsonb, 2),
      ('coffee',    '{"en":"Coffee","am":"ቡና","om":"Buna"}'::jsonb, 3),
      ('hot-drinks', '{"en":"Hot Drinks","am":"ትኩስ መጠጦች","om":"Dhugaatii Ho''aa"}'::jsonb, 4)
    ) as v(slug, name, ord)
   where not exists (select 1 from categories c where c.restaurant_id = rid and c.slug = v.slug);

  -- Refresh names/order for the ones that already existed.
  update categories
     set name_i18n = '{"en":"Food","am":"ምግብ","om":"Nyaata"}'::jsonb, sort_order = 1, is_active = true
   where restaurant_id = rid and slug = 'food';
  update categories
     set name_i18n = '{"en":"Fast Food","am":"ፈጣን ምግብ","om":"Nyaata Dqqaa"}'::jsonb, sort_order = 2, is_active = true
   where restaurant_id = rid and slug = 'fast-food';
  update categories
     set name_i18n = '{"en":"Coffee","am":"ቡና","om":"Buna"}'::jsonb, sort_order = 3, is_active = true
   where restaurant_id = rid and slug = 'coffee';
  update categories
     set name_i18n = '{"en":"Hot Drinks","am":"ትኩስ መጠጦች","om":"Dhugaatii Ho''aa"}'::jsonb, sort_order = 4, is_active = true
   where restaurant_id = rid and slug = 'hot-drinks';

  select id into cid_food      from categories where restaurant_id = rid and slug = 'food';
  select id into cid_fastfood  from categories where restaurant_id = rid and slug = 'fast-food';
  select id into cid_coffee    from categories where restaurant_id = rid and slug = 'coffee';
  select id into cid_hotdrinks from categories where restaurant_id = rid and slug = 'hot-drinks';

  -- 2. Rebucket existing items by their current category slug.
  update menu_items m
     set category_id = cid_coffee
    where m.category_id = (select id from categories where restaurant_id = rid and slug = 'coffee-drinks')
      and m.id in (
        select mi.id from menu_items mi
         where mi.name_i18n->>'en' ilike '%coffee%'
            or mi.name_i18n->>'en' ilike '%espresso%'
            or mi.name_i18n->>'en' ilike '%buna%'
            or mi.name_i18n->>'en' ilike '%milkshake%'
      );

  update menu_items m
     set category_id = cid_hotdrinks
    where m.category_id in (
        select id from categories
         where restaurant_id = rid and slug in ('coffee-drinks', 'cocktails')
      );

  update menu_items m
     set category_id = cid_coffee
    where m.category_id = (select id from categories where restaurant_id = rid and slug = 'milkshakes');

  update menu_items m
     set category_id = cid_food
    where m.category_id in (
        select id from categories
         where restaurant_id = rid and slug in ('ethiopian-food', 'breakfast', 'lunch', 'pizza-pasta')
      );

  update menu_items m
     set category_id = cid_fastfood
    where m.category_id = (select id from categories where restaurant_id = rid and slug = 'desserts');

  -- 3. Retire the old categories (kept for historical order/analytics joins).
  update categories
     set is_active = false
    where restaurant_id = rid
      and slug in ('coffee-drinks', 'milkshakes', 'breakfast', 'ethiopian-food',
                   'lunch', 'pizza-pasta', 'cocktails', 'desserts');

  -- 4. Sequential sort order inside each new category.
  with ranked as (
    select id, row_number() over (partition by category_id order by sort_order, price) as rn
      from menu_items
  )
  update menu_items m
     set sort_order = ranked.rn
    from ranked
   where m.id = ranked.id;
end $$;

-- Verify: what the cafe menu will now look like.
select c.slug as category, c.sort_order, count(m.id) as items
  from categories c
  left join menu_items m on m.category_id = c.id
 where c.is_active
 group by c.slug, c.sort_order
 order by c.sort_order;

select m.name_i18n->>'en' as item, c.slug as category, m.station
  from menu_items m
  join categories c on c.id = m.category_id
 order by c.sort_order, m.sort_order;

notify pgrst, 'reload schema';
