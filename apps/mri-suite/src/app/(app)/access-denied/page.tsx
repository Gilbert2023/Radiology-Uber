import Link from "next/link";
import { ShieldX } from "lucide-react";
import { getActor } from "@/server/auth";
import { homeFor } from "@/lib/nav";
export default async function Page({ searchParams }: { searchParams: Promise<{ need?: string }> }) {
  const { need } = await searchParams;
  const a = await getActor();
  return (
    <div className="mx-auto mt-16 max-w-md text-center">
      <ShieldX className="mx-auto h-12 w-12 text-red-400" />
      <h1 className="mt-4 text-xl font-bold">Access restricted</h1>
      <p className="mt-2 text-sm text-slate-600">Your role ({a?.roleName}) does not include access to this area{need ? <> (requires <code className="rounded bg-slate-100 px-1">{need}</code>)</> : null}. This attempt has not changed any data. Contact the MRI Supervisor or System Administrator if you need access.</p>
      <Link href={a ? homeFor(a.permissions) : "/login"} className="btn-primary mt-6">Go to my home page</Link>
    </div>
  );
}
