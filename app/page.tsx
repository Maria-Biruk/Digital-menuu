'use client';

import React from 'react';
import DigitalMenuView from '../components/DigitalMenuView';
import { SLUG } from '../lib/mock';

export default function RootPage() {
  return <DigitalMenuView tableId="t1" slug={SLUG} initialLang="en" />;
}
