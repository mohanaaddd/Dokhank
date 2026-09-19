import { productById } from '../lib/catalogStore';
import { localize } from './format';
import type { Locale, OrderLine } from '../types';

/**
 * Order lines carry their own snapshot from `order_items`. The live catalog is
 * only a fallback for the image, which is not snapshotted — so a renamed or
 * delisted product still shows the name and price the member actually paid.
 */

export function lineName(line: OrderLine, locale: Locale): string {
  if (line.name) return localize(line.name, locale);
  const product = productById(line.productId);
  return product ? localize(product.name, locale) : line.productId;
}

export function lineImage(line: OrderLine): string | undefined {
  return line.image ?? productById(line.productId)?.image;
}

export function lineTotal(line: OrderLine): number {
  const unit = line.unitPrice ?? productById(line.productId)?.price ?? 0;
  return unit * line.quantity;
}