import { redirect } from "next/navigation";
import { requireActor } from "@/server/auth";
import { homeFor } from "@/lib/nav";
export default async function Home() { const a = await requireActor(); redirect(homeFor(a.permissions)); }
