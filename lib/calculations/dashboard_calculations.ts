import type { Customer } from "@/lib/types";

export function TotalCustomers(customers: Customer[]): number {
  return customers.length;
}
