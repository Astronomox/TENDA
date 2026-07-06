import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { customers as mockCustomers } from "@/lib/mock/customers";

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export async function getCustomers() {
  if (DEMO_MODE) return mockCustomers;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("Customers").select("*");

  if (error) {
    console.error("GET CUSTOMERS ERROR:", error.message);
    return [];
  }

  // Normalize shape to the shared Customer type.
  return data.map((c) => ({
    id: c.id,
    name: c.name,
    phone_number: c.phone_number,
    email: c.email,
    created_at: c.created_at,
  }));
}
