import type { Sale } from "@/lib/types";

function shiftDate(monthsAgo: number, day: number) {
  const date = new Date();
  date.setMonth(date.getMonth() - monthsAgo);
  date.setDate(day);
  return date.toISOString();
}

export const sales: Sale[] = [
  // c1 - p1 (monthly pattern)
  { id: 1, customerId: "c1", productId: "p1", quantity: 1, createdAt: shiftDate(3, 1) },
  { id: 2, customerId: "c1", productId: "p1", quantity: 1, createdAt: shiftDate(2, 2) },
  { id: 3, customerId: "c1", productId: "p1", quantity: 1, createdAt: shiftDate(1, 4) },

  // c1 - p2
  { id: 4, customerId: "c1", productId: "p2", quantity: 2, createdAt: shiftDate(3, 15) },
  { id: 5, customerId: "c1", productId: "p2", quantity: 1, createdAt: shiftDate(1, 10) },

  // c2 - p1
  { id: 6, customerId: "c2", productId: "p1", quantity: 1, createdAt: shiftDate(3, 5) },
  { id: 7, customerId: "c2", productId: "p1", quantity: 1, createdAt: shiftDate(2, 6) },

  // c2 - p3 (strong repeat)
  { id: 8, customerId: "c2", productId: "p3", quantity: 3, createdAt: shiftDate(3, 20) },
  { id: 9, customerId: "c2", productId: "p3", quantity: 2, createdAt: shiftDate(2, 22) },
  { id: 10, customerId: "c2", productId: "p3", quantity: 1, createdAt: shiftDate(1, 25) },

  // c3 - p2
  { id: 11, customerId: "c3", productId: "p2", quantity: 1, createdAt: shiftDate(3, 3) },
  { id: 12, customerId: "c3", productId: "p2", quantity: 1, createdAt: shiftDate(3, 28) },
  { id: 13, customerId: "c3", productId: "p2", quantity: 1, createdAt: shiftDate(2, 25) },

  // c3 - p4
  { id: 14, customerId: "c3", productId: "p4", quantity: 1, createdAt: shiftDate(3, 10) },
  { id: 15, customerId: "c3", productId: "p4", quantity: 1, createdAt: shiftDate(1, 15) },

  // mixed recent activity
  { id: 16, customerId: "c1", productId: "p3", quantity: 1, createdAt: shiftDate(2, 18) },
  { id: 17, customerId: "c2", productId: "p2", quantity: 1, createdAt: shiftDate(1, 1) },
  { id: 18, customerId: "c3", productId: "p1", quantity: 1, createdAt: shiftDate(1, 5) },

  // very recent (current month)
  { id: 19, customerId: "c1", productId: "p1", quantity: 1, createdAt: shiftDate(0, 6) },
  { id: 20, customerId: "c2", productId: "p3", quantity: 2, createdAt: shiftDate(0, 12) },
];
