'use client';

import React from 'react';
import { FooterAdBox } from './FooterAdBox';
import { AdPageTarget } from '@/lib/types';

export { FooterAdBox } from './FooterAdBox';

export const FooterAd: React.FC<{ page?: AdPageTarget; className?: string }> = (props) => {
  return <FooterAdBox {...props} />;
};
