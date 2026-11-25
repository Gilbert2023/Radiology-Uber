import { NextResponse, type NextRequest } from "next/server";
import { getActor } from "@/server/auth";
import { searchPatients } from "@/server/services/patients";

export async function GET(req: NextRequest) {
  const a = await getActor();
  if (!a || !a.permissions.has("patients.view")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const term = (req.nextUrl.searchParams.get("q") || "").slice(0, 80);
  if (term.trim().length < 2) return NextResponse.json([]);
  return NextResponse.json(await searchPatients(term, 12));
}
