"use client";

import React, { Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Lang } from "../../../../lib/types";
import { SLUG } from "../../../../lib/mock";
import DigitalMenuView from "../../../../components/DigitalMenuView";

function TableMenuPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();

  const slug = (params?.restaurantSlug as string) || SLUG;
  const tableId = (params?.tableId as string) || "t1";
  const initialLang = (searchParams.get("lang") as Lang) || "en";

  return (
    <DigitalMenuView tableId={tableId} slug={slug} initialLang={initialLang} />
  );
}

export default function TableMenuPage() {
  return (
    <Suspense fallback={null}>
      <TableMenuPageContent />
    </Suspense>
  );
}
