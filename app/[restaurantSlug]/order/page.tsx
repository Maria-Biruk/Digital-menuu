'use client';

import React from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Lang } from '../../../lib/types';
import { SLUG } from '../../../lib/mock';
import DigitalMenuView from '../../../components/DigitalMenuView';

export default function OrderLandingPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const slug = (params?.restaurantSlug as string) || SLUG;
  const tableId = searchParams?.get('table') || 't1';
  const initialLang = (searchParams?.get('lang') as Lang) || 'en';

  return (
    <DigitalMenuView
      tableId={tableId}
      slug={slug}
      initialLang={initialLang}
    />
  );
}

