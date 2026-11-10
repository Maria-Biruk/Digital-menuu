import { redirect } from "next/navigation";

/**
 * Root slug route — redirect to the menu/order page.
 * This prevents 404 when navigating to /{restaurantSlug} directly.
 */
export default function RestaurantRootPage({
  params,
}: {
  params: { restaurantSlug: string };
}) {
  redirect(`/${params.restaurantSlug}/order`);
}

