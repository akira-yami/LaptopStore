export interface CartItem {
  cartItemId: number;
  productId?: number | null;
  variantId: number;
  productName: string;
  sku: string;
  variantName: string;
  thumbnailImage?: string | null;
  quantity: number;
  availableStock?: number | null;
  sellable?: boolean;
  unitPrice: number;
  lineTotal: number;
}

export interface Cart {
  id: number | null;
  items: CartItem[];
  totalItems: number;
  totalAmount: number;
}
