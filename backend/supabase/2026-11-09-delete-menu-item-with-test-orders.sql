-- Permanently delete a menu item and every test order containing it.
-- Only active restaurant admins, owners, and super admins can call this.
-- The caller must confirm this destructive action in the admin UI.

CREATE OR REPLACE FUNCTION public.admin_delete_menu_item(p_menu_item_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_restaurant_id uuid;
  v_order_ids uuid[];
  v_deleted_orders integer := 0;
BEGIN
  SELECT c.restaurant_id
    INTO v_restaurant_id
    FROM public.menu_items AS mi
    JOIN public.categories AS c ON c.id = mi.category_id
   WHERE mi.id = p_menu_item_id
   FOR UPDATE OF mi;

  IF v_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'Menu item not found.' USING ERRCODE = 'P0002';
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM public.staff_users AS staff
     WHERE staff.id = (SELECT auth.uid())
       AND staff.is_active = true
       AND staff.role::text IN ('super_admin', 'owner', 'admin')
       AND (
         staff.role::text IN ('super_admin', 'owner')
         OR staff.restaurant_id = v_restaurant_id
       )
  ) THEN
    RAISE EXCEPTION 'You do not have permission to delete this menu item.'
      USING ERRCODE = '42501';
  END IF;

  SELECT array_agg(DISTINCT oi.order_id)
    INTO v_order_ids
    FROM public.order_items AS oi
   WHERE oi.menu_item_id = p_menu_item_id;

  IF v_order_ids IS NOT NULL THEN
    -- Remove all lines for each linked test order, not just this item.
    -- order_items reference station tickets, so remove them first.
    DELETE FROM public.order_items
     WHERE order_id = ANY(v_order_ids);

    DELETE FROM public.order_secrets
     WHERE order_id = ANY(v_order_ids);

    DELETE FROM public.payments
     WHERE order_id = ANY(v_order_ids);

    DELETE FROM public.order_station_tickets
     WHERE order_id = ANY(v_order_ids);

    DELETE FROM public.orders
     WHERE id = ANY(v_order_ids);

    GET DIAGNOSTICS v_deleted_orders = ROW_COUNT;
  END IF;

  DELETE FROM public.menu_items
   WHERE id = p_menu_item_id;

  RETURN jsonb_build_object(
    'ok', true,
    'deleted_orders', v_deleted_orders
  );
END;
$$;

-- CREATE OR REPLACE preserves the old owner. Run the function as postgres so
-- it can perform the protected deletes; the staff-role check above remains
-- mandatory for every call.
ALTER FUNCTION public.admin_delete_menu_item(uuid) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.admin_delete_menu_item(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_menu_item(uuid) TO authenticated;

-- Prevent bypassing the order cleanup through direct REST deletes.
DROP POLICY IF EXISTS menu_items_admin_delete ON public.menu_items;
REVOKE DELETE ON TABLE public.menu_items FROM PUBLIC, anon, authenticated;

NOTIFY pgrst, 'reload schema';
