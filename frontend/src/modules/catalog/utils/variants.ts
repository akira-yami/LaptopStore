import type { VariantSnapshot } from '../types/catalog';

export const isSellableVariant = (variant: VariantSnapshot) =>
  (!variant.status || variant.status.toUpperCase() === 'ACTIVE') && variant.quantity > 0;
