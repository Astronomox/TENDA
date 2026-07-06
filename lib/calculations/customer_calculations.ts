import type { Sale } from "@/lib/types";

// Total number of product units a customer has purchased across all their sales.
export function TotalPurchased(customerId: string, sales: Sale[]): number {
  return sales
    .filter((sale) => sale.customerId === customerId)
    .reduce((sum, sale) => sum + sale.quantity, 0);
}
