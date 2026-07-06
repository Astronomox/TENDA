"use server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function AddSalesLogic(formData: FormData) {
  const Customer_name = formData.get("customer_name") as string;
  const product_name = formData.get("product_name") as string;
  const Unit = formData.get("unit") as string;
  const Price = formData.get("price") as string;

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.id) {
    throw new Error("User not logged in");
  }

  const { data, error } = await supabase
    .from("Sales")
    .insert([{ user_id: user.id, Customer_name, product_name, Unit, Price }])
    .select()
    .single();

  if (error) {
    console.error("ADD SALE ERROR:", error.message);
  }

  return data;
}
