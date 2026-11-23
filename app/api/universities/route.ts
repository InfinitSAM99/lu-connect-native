import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Fetch universities. Change "universities" if your table is named differently (e.g., "campuses")
  const { data: universities, error } = await supabase
    .from("universities")
    .select("id, name, logo_url")
    .limit(20);

  if (error) {
    console.error("Failed to fetch universities:", error);
    return NextResponse.json({ universities: [] });
  }

  return NextResponse.json({ universities: universities || [] });
}
