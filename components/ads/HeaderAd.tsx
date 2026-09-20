'use client';

import React from 'react';
import { HeaderAdBox } from './HeaderAdBox';
import { AdPageTarget } from '@/lib/types';

export { HeaderAdBox, detectCurrentAdPage } from './HeaderAdBox';

export const HeaderAd: React.FC<{ page?: AdPageTarget; className?: string }> = (props) => {
  return <HeaderAdBox {...props} />;
};
