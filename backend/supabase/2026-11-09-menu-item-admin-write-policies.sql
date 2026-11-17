-- Allow signed-in, active menu administrators to create, edit, and delete menu
-- items. This keeps menu writes protected by the staff_users role, rather
-- than relying on the client-side admin page guard.

GRANT INSERT, UPDATE, DELETE ON TABLE public.menu_items TO authenticated;

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS menu_items_admin_insert ON public.menu_items;
CREATE POLICY menu_items_admin_insert
  ON public.menu_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.staff_users AS staff
      WHERE staff.id = (SELECT auth.uid())
        AND staff.is_active = true
        AND staff.role::text IN ('super_admin', 'owner', 'admin')
    )
  );

DROP POLICY IF EXISTS menu_items_admin_update ON public.menu_items;
CREATE POLICY menu_items_admin_update
  ON public.menu_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.staff_users AS staff
      WHERE staff.id = (SELECT auth.uid())
        AND staff.is_active = true
        AND staff.role::text IN ('super_admin', 'owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.staff_users AS staff
      WHERE staff.id = (SELECT auth.uid())
        AND staff.is_active = true
        AND staff.role::text IN ('super_admin', 'owner', 'admin')
    )
  );

DROP POLICY IF EXISTS menu_items_admin_delete ON public.menu_items;
CREATE POLICY menu_items_admin_delete
  ON public.menu_items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.staff_users AS staff
      WHERE staff.id = (SELECT auth.uid())
        AND staff.is_active = true
        AND staff.role::text IN ('super_admin', 'owner', 'admin')
    )
  );
