import { sales } from "../mock/sales";
import { products } from "../mock/products";

// --- Helper ---
function getProductPrice(productId: string): number {
  // Temporary pricing logic until product prices come from the database.
  const priceMap: Record<string, number> = {
    p1: 15000,
    p2: 8000,
    p3: 6000,
    p4: 12000,
  };

  return priceMap[productId] || 0;
}

// --- 1. Total Revenue ---
export function getTotalRevenue(): number {
  return sales.reduce((sum, sale) => {
    return sum + getProductPrice(sale.productId) * sale.quantity;
  }, 0);
}

// --- 2. Monthly Revenue ---
export function getMonthlyRevenue(month: number, year: number): number {
  const filtered = sales.filter((sale) => {
    const date = new Date(sale.createdAt);
    return date.getMonth() === month && date.getFullYear() === year;
  });

  return filtered.reduce((sum, sale) => {
    return sum + getProductPrice(sale.productId) * sale.quantity;
  }, 0);
}

// --- 3. Total Sales Count ---
export function getTotalSalesCount(): number {
  return sales.length;
}

// --- 4. Recent Transactions ---
export function getRecentTransactions(limit: number = 5) {
  return [...sales]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, limit)
    .map((sale) => ({
      ...sale,
      totalAmount: getProductPrice(sale.productId) * sale.quantity,
    }));
}

// --- 5. Top Selling Products ---
export function getTopProducts(limit: number = 3) {
  const productTotals: Record<string, number> = {};

  sales.forEach((sale) => {
    productTotals[sale.productId] =
      (productTotals[sale.productId] || 0) + sale.quantity;
  });

  return Object.entries(productTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([productId, quantity]) => {
      const product = products.find((p) => p.id === productId);
      return {
        productId,
        name: product?.name || "Unknown",
        quantity,
      };
    });
}

// --- 6. Simple Repurchase Prediction ---
export function getPredictedReorders(today: Date = new Date()) {
  const grouped: Record<string, Record<string, Date[]>> = {};

  sales.forEach((sale) => {
    if (!grouped[sale.customerId]) {
      grouped[sale.customerId] = {};
    }
    if (!grouped[sale.customerId][sale.productId]) {
      grouped[sale.customerId][sale.productId] = [];
    }
    grouped[sale.customerId][sale.productId].push(new Date(sale.createdAt));
  });

  const predictions: {
    customerId: string;
    productId: string;
    predictedDate: Date;
  }[] = [];

  Object.entries(grouped).forEach(([customerId, customerProducts]) => {
    Object.entries(customerProducts).forEach(([productId, dates]) => {
      if (dates.length < 2) return;

      const sorted = dates.sort((a, b) => a.getTime() - b.getTime());
      const intervals: number[] = [];

      for (let i = 1; i < sorted.length; i++) {
        const diff =
          (sorted[i].getTime() - sorted[i - 1].getTime()) /
          (1000 * 60 * 60 * 24);
        intervals.push(diff);
      }

      const avg = intervals.reduce((s, d) => s + d, 0) / intervals.length;
      const last = sorted[sorted.length - 1];
      const predicted = new Date(last.getTime() + avg * 24 * 60 * 60 * 1000);

      if (predicted <= today) {
        predictions.push({ customerId, productId, predictedDate: predicted });
      }
    });
  });

  return predictions;
}
