import React from 'react';
import { useTranslation } from 'react-i18next';
import { NeonBadge } from '../ui/NeonBadge';
import type { OrderStatus } from '../../types';

/** Status is carried by colour everywhere in ops, so the mapping lives once. */
export const STATUS_TONE: Record<OrderStatus, 'lime' | 'cyan' | 'magenta' | 'amber' | 'muted'> = {
  confirmed: 'amber',
  packing: 'cyan',
  on_the_way: 'lime',
  delivered: 'muted',
  cancelled: 'magenta'
};

export function StatusPill({ status }: {status: OrderStatus;}) {
  const { t } = useTranslation();
  return <NeonBadge tone={STATUS_TONE[status]}>{t(`tracking.${status}`)}</NeonBadge>;
}