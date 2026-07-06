"use server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function addCustomer(formData: FormData) {
  const name = formData.get("name") as string;
  const number = formData.get("number");
  const email = formData.get("email") as string;

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.id) {
    throw new Error("User not authenticated");
  }

  const { data, error } = await supabase
    .from("Customers")
    .insert([{ user_id: user.id, name, phone_number: number, email }])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}
