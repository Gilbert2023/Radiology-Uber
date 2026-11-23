import { NextResponse } from "next/server";
import { one } from "@/lib/db";
export const dynamic = "force-dynamic";
export async function GET() {
  try { await one("SELECT 1"); return NextResponse.json({ status: "ok", db: "ok" }); }
  catch { return NextResponse.json({ status: "degraded", db: "unreachable" }, { status: 503 }); }
}
