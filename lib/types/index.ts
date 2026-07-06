// Shared domain types used across data fetchers, calculations and UI.

export type Customer = {
  id: string;
  name: string;
  phone_number: string;
  email: string;
  created_at?: string;
};

export type Product = {
  id: string;
  name: string;
  price?: number;
};

// A single sale record (matches the mock shape and the normalized DB shape).
export type Sale = {
  id: number;
  customerId: string;
  productId: string;
  quantity: number;
  createdAt: string;
};
