import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { sales as mockSales } from "@/lib/mock/sales";

type SaleItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
};

type SaleWithItems = {
  id: number;
  customerId: string;
  createdAt: string;
  items: SaleItem[];
};

export async function getSales(): Promise<SaleWithItems[]> {
  const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  if (DEMO_MODE) {
    return mockSales.map((sale) => ({
      id: sale.id,
      customerId: sale.customerId,
      createdAt: sale.createdAt,
      items: [
        {
          productId: sale.productId,
          name: "Mock Product",
          price: 0,
          quantity: sale.quantity,
        },
      ],
    }));
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("Sales").select(`
      id,
      created_at,
      customer_id,
      sale_items (
        quantity,
        product_id,
        products (
          id,
          product_name,
          price
        )
      )
    `);

  if (error) {
    console.error("GET SALES ERROR:", error.message);
    return [];
  }

  // Normalize Supabase rows into the same shape as the mock data.
  return data.map((sale: any) => ({
    id: sale.id,
    customerId: String(sale.customer_id),
    createdAt: sale.created_at,
    items: sale.sale_items.map((item: any) => ({
      productId: String(item.product_id),
      name: item.products?.product_name ?? "",
      price: item.products?.price ?? 0,
      quantity: item.quantity,
    })),
  }));
}
