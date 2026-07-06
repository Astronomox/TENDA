import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { products as mockProducts } from "@/lib/mock/products";

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export async function getProducts() {
  if (DEMO_MODE) return mockProducts;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("products").select("*");

  if (error) {
    console.error("GET PRODUCTS ERROR:", error.message);
    return [];
  }

  return data.map((p) => ({
    id: p.id,
    name: p.product_name,
    price: p.price,
  }));
}
