// lib/algorithm/salesEngine.ts
import { getSales } from "../data/sales";
import { getCustomers } from "../data/customers";
import { getProducts } from "../data/product";
export async function getFollowUpRecommendations(
  today = new Date()
) {
  const sales = await getSales();
  const customers = await getCustomers();
  const products = await getProducts();
  const grouped: Record<
    string,
    Record<string, Date[]>
  > = {};
  // 🔥 GROUP using items[]
  sales.forEach((sale: any) => {
    sale.items.forEach((item: any) => {
      if (!grouped[sale.customerId]) {
        grouped[sale.customerId] = {};
      }
      if (!grouped[sale.customerId][item.productId]) {
        grouped[sale.customerId][item.productId] = [];
      }
      grouped[sale.customerId][item.productId].push(
        new Date(sale.createdAt)
      );
    });
  });
  const results: {
    customerId: string;
    customerName: string;
    productId: string;
    productName: string;
    lastPurchase: Date;
    predictedDate: Date;
    nextExpected: Date;
    daysUntil: number;
    daysOverdue: number;
    status: "overdue" | "due_soon";
  }[] = [];
  // 🔥 ANALYSIS
  Object.entries(grouped).forEach(
    ([customerId, customerProducts]) => {
      Object.entries(customerProducts).forEach(
        ([productId, dates]) => {
          if (dates.length < 2) return;
          const sorted = dates.sort(
            (a, b) => a.getTime() - b.getTime()
          );
          const intervals: number[] = [];
          for (let i = 1; i < sorted.length; i++) {
            const diff =
              (sorted[i].getTime() -
                sorted[i - 1].getTime()) /
              (1000 * 60 * 60 * 24);
            intervals.push(diff);
          }
          const avgInterval =
            intervals.reduce((sum, d) => sum + d, 0) /
            intervals.length;
          const lastPurchase = sorted[sorted.length - 1];
          const predictedDate = new Date(
            lastPurchase.getTime() +
              avgInterval * 24 * 60 * 60 * 1000
          );
          const diffDays =
            (predictedDate.getTime() - today.getTime()) /
            (1000 * 60 * 60 * 24);
          let status: "overdue" | "due_soon" | null = null;
          if (diffDays <= 0) {
            status = "overdue";
          } else if (diffDays <= 3) {
            status = "due_soon";
          }
          if (!status) return;
          const customer = customers.find(
            (c: any) => c.id === customerId
          );
          const product = products.find(
            (p: any) => p.id === productId
          );
          const daysOverdue =
            status === "overdue"
              ? Math.abs(Math.floor(diffDays))
              : 0;
          results.push({
            customerId,
            customerName: customer?.name || "Unknown",
            productId,
            productName: product?.name || "Unknown",
            lastPurchase,
            predictedDate,
            nextExpected: predictedDate,
            daysUntil: Math.floor(diffDays),
            daysOverdue,
            status,
          });
        }
      );
    }
  );
  // 🔥 SORT (critical for UX)
  results.sort((a, b) => {
    if (a.status === "overdue" && b.status !== "overdue")
      return -1;
    if (b.status === "overdue" && a.status !== "overdue")
      return 1;
    return b.daysOverdue - a.daysOverdue;
  });
  return results;
}