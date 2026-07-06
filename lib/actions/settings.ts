"use server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function addProductsLogic(formData: FormData) {
  const supabase = await createSupabaseServerClient();

  // 1. Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    console.error("AUTH ERROR:", authError.message);
    throw authError;
  }

  if (!user) {
    throw new Error("User not authenticated");
  }

  // 2. Extract form arrays
  const productNames = formData.getAll("name") as string[];
  const prices = formData.getAll("price") as string[];
  const repurchaseTimes = formData.getAll("repurchase_time") as string[];
  const replenishableValues = formData.getAll("isReplenishable") as string[];

  // 3. Build products array
  const products = productNames
    .map((name, index) => {
      const trimmedName = name?.trim();
      const parsedPrice = parseFloat(prices[index]);
      const parsedRepurchaseTime = parseInt(repurchaseTimes[index]);
      const isReplenishable = replenishableValues[index] === "true";

      // Skip completely empty rows
      if (!trimmedName && isNaN(parsedPrice)) return null;

      if (!trimmedName) {
        throw new Error(`Product name missing at row ${index + 1}`);
      }

      if (isNaN(parsedPrice)) {
        throw new Error(`Invalid price at row ${index + 1}`);
      }

      return {
        user_id: user.id,
        product_name: trimmedName,
        price: parsedPrice,
        average_repurchase_time: isNaN(parsedRepurchaseTime)
          ? null
          : parsedRepurchaseTime,
        is_replenishable: isReplenishable,
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  if (products.length === 0) {
    throw new Error("No valid products to insert");
  }

  // 4. Insert into Supabase
  const { error } = await supabase.from("products").insert(products).select();

  if (error) {
    console.error("INSERT ERROR:", error.message);
    throw error;
  }
}

export async function addBusinessStructureLogic(formData: FormData) {
  const sales_rythm = formData.getAll("name");
  const order_style = formData.getAll("price");
  const sales_channel = formData.getAll("sales_channel");

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.id) {
    throw new Error("User not authenticated");
  }

  const { data, error } = await supabase
    .from("business_structure")
    .insert([{ user_id: user.id, sales_rythm, order_style, sales_channel }])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}
