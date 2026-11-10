'use client';

import React, { Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Lang } from '../../../lib/types';
import { SLUG } from '../../../lib/mock';
import DigitalMenuView from '../../../components/DigitalMenuView';

function OrderLandingPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();

  const slug = (params?.restaurantSlug as string) || SLUG;
  const tableParam = searchParams?.get('table') || '';
  const tableId = tableParam || 't1';
  const initialLang = (searchParams?.get('lang') as Lang) || 'en';

  return (
    <DigitalMenuView
      tableId={tableId}
      slug={slug}
      initialLang={initialLang}
      askTableOnArrival={!tableParam}
    />
  );
}

export default function OrderLandingPage() {
  return (
    <Suspense fallback={null}>
      <OrderLandingPageContent />
    </Suspense>
  );
}

