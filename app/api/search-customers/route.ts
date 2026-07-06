import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";

  if (!q || q.length < 1) return NextResponse.json([]);

  // Sanitize: strip regex special chars, limit length
  const safe = q.replace(/[%_\\]/g, "").slice(0, 50);

  try {
    const supabase = await createSupabaseServerClient();

    // Verify session - only authenticated users can search
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json([], { status: 401 });
    }

    const { data, error } = await supabase
      .from("Customers")
      .select("id, name")
      .ilike("name", `${safe}%`)
      .limit(5);

    if (error) return NextResponse.json([]);

    return NextResponse.json(data);
  } catch {
    return NextResponse.json([]);
  }
}
