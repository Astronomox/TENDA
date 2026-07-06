import { customers } from "@/lib/mock/customers";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import CustomersClient from "./CustomerClient";

export default async function CustomersPage() {
  const FORCE_MOCK = process.env.USE_MOCK === "true";

  let customersData;

  if (FORCE_MOCK) {
    customersData = customers;
  } else {
    try {
      const supabase = await createSupabaseServerClient();

      const { data, error } = await supabase
        .from("Customers")
        .select("id,name,phone_number,email");

      if (error) throw error;

      customersData = data;
    } catch {
      console.warn("DB fetch failed, falling back to mock data");
      customersData = customers;
    }
  }

  return (
    <div>
      <CustomersClient customers={customersData} />
    </div>
  );
}
