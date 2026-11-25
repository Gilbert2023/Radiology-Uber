import { KeyRound, Lock } from "lucide-react";
import { requireActor } from "@/server/auth";
import { q } from "@/lib/db";
import { PageHeader, Card, Notice, Badge } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/client/forms";
import { rolePermsAction } from "../actions";
export const metadata = { title: "Roles & Permissions" };
export default async function Roles({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireActor("admin.roles");
  const sp = await searchParams;
  const roles = await q(`SELECT r.*, (SELECT count(*) FROM users u WHERE u.role_id=r.id)::int AS users FROM roles r ORDER BY r.name`);
  const perms = await q(`SELECT * FROM permissions ORDER BY module, code`);
  const role = roles.find((r) => r.id === sp.role) ?? roles[0];
  const granted = new Set((await q(`SELECT permission_code FROM role_permissions WHERE role_id=$1`, [role.id])).map((r) => r.permission_code));
  const modules = [...new Set(perms.map((p) => p.module))];
  return (
    <div>
      <PageHeader title="Roles & Permissions" icon={KeyRound} description="Least-privilege role-based access control. Changes take effect on the user's next request and are audited." />
      <Notice className="mb-4">There is intentionally no radiologist role: the patient journey ends at confirmed PACS upload. Permissions marked <Lock className="inline h-3 w-3" /> are sensitive.</Notice>
      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <Card title="Roles" bodyClass="p-2"><ul>{roles.map((r) => <li key={r.id}><a href={`?role=${r.id}`} className={`block rounded-lg px-3 py-2 text-sm ${r.id === role.id ? "bg-brand-50 font-semibold text-brand-900" : "hover:bg-slate-50"}`}>{r.name}<span className="block text-xs font-normal text-slate-500">{r.users} user(s)</span></a></li>)}</ul></Card>
        <Card title={role.name} subtitle={role.description}>
          <ActionForm action={rolePermsAction} className="space-y-4">
            <input type="hidden" name="roleId" value={role.id} />
            {modules.map((m) => (
              <fieldset key={m}><legend className="label">{m}</legend>
                <div className="grid gap-1.5 md:grid-cols-2">{perms.filter((p) => p.module === m).map((p) => (
                  <label key={p.code} className="flex items-start gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm has-[:checked]:border-accent-300 has-[:checked]:bg-accent-50/60">
                    <input type="checkbox" name="perms" value={p.code} defaultChecked={granted.has(p.code)} className="mt-0.5 h-4 w-4" />
                    <span><span className="font-medium">{p.description}</span> {p.is_sensitive && <Lock className="inline h-3 w-3 text-amber-600" />}<span className="block font-mono text-[10px] text-slate-400">{p.code}</span></span>
                  </label>))}</div>
              </fieldset>))}
            <SubmitButton>Save permissions</SubmitButton>
          </ActionForm>
        </Card>
      </div>
    </div>
  );
}
