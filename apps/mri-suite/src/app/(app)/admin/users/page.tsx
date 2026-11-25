import { UserCog, Plus } from "lucide-react";
import { requireActor } from "@/server/auth";
import { q } from "@/lib/db";
import { PageHeader, Card, Badge, Notice } from "@/components/ui";
import { ActionForm, SubmitButton, Modal } from "@/components/client/forms";
import { ResetLink } from "@/components/client/ResetLink";
import { PASSWORD_RULE } from "@/server/services/admin";
import { fmtDateTime } from "@/lib/time";
import { saveUserAction, resetLinkAction, unlockAction, revokeAction } from "../actions";
export const metadata = { title: "User Management" };
function UserForm({ u, roles, staff }: { u?: any; roles: any[]; staff: any[] }) {
  return (
    <ActionForm action={saveUserAction} className="grid gap-3 sm:grid-cols-2">
      {u && <input type="hidden" name="id" value={u.id} />}
      <div><label className="label">Username *</label><input name="username" className="input" required defaultValue={u?.username} autoComplete="off" /></div>
      <div><label className="label">Full name *</label><input name="fullName" className="input" required defaultValue={u?.full_name} /></div>
      <div><label className="label">Email</label><input name="email" type="email" className="input" defaultValue={u?.email ?? ""} /></div>
      <div><label className="label">Role *</label><select name="roleId" className="input" defaultValue={u?.role_id}>{roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
      <div><label className="label">Linked staff record</label><select name="staffId" className="input" defaultValue={u?.staff_id ?? ""}><option value="">—</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.full_name} ({s.staff_no})</option>)}</select></div>
      <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={u ? u.is_active : true} />Active</label>
      {!u && <div className="sm:col-span-2"><label className="label">Initial password * (user must change at first sign-in)</label><input name="password" type="password" className="input" required autoComplete="new-password" /><p className="mt-1 text-xs text-slate-500">{PASSWORD_RULE}</p></div>}
      <div className="sm:col-span-2"><SubmitButton>Save user</SubmitButton></div>
    </ActionForm>
  );
}
export default async function Users() {
  await requireActor("admin.users");
  const [users, roles, staff] = await Promise.all([
    q(`SELECT u.*, r.name AS role, st.full_name AS staff_name, (SELECT count(*) FROM sessions s WHERE s.user_id=u.id AND s.expires_at > now())::int AS sessions FROM users u JOIN roles r ON r.id=u.role_id LEFT JOIN staff st ON st.id=u.staff_id ORDER BY u.is_active DESC, u.full_name`),
    q(`SELECT * FROM roles ORDER BY name`), q(`SELECT id, full_name, staff_no FROM staff ORDER BY full_name`)]);
  return (
    <div>
      <PageHeader title="User Management" icon={UserCog} description="Accounts, role assignment, account lock-out, sessions and password resets."
        actions={<Modal title="Create user" wide trigger={<><Plus className="h-4 w-4" />New user</>} triggerClass="btn-accent"><UserForm roles={roles} staff={staff} /></Modal>} />
      <Notice className="mb-4">Email is not connected, so password resets use a one-time link issued here (valid 24 hours) that you hand to the user securely. Accounts lock for 15 minutes after 5 failed sign-ins.</Notice>
      <Card bodyClass="p-0 overflow-x-auto"><table className="table"><thead><tr><th>User</th><th>Role</th><th>Staff record</th><th>Status</th><th>Last sign-in</th><th>Sessions</th><th>Actions</th></tr></thead>
        <tbody>{users.map((u) => <tr key={u.id}><td className="font-medium">{u.full_name}<div className="font-mono text-xs text-slate-500">{u.username}</div></td><td>{u.role}</td><td>{u.staff_name ?? "—"}</td>
          <td>{u.is_active ? <Badge className="bg-green-50 text-green-800 ring-green-200">Active</Badge> : <Badge>Inactive</Badge>}{u.locked_until && new Date(u.locked_until) > new Date() && <Badge className="ml-1 bg-red-50 text-red-700 ring-red-200">Locked</Badge>}{u.must_change_password && <Badge className="ml-1 bg-amber-50 text-amber-800 ring-amber-200">Must change pw</Badge>}</td>
          <td className="text-xs">{fmtDateTime(u.last_login_at)}</td><td>{u.sessions}</td>
          <td><div className="flex flex-wrap items-start gap-1">
            <Modal title={`Edit ${u.full_name}`} wide trigger="Edit" triggerClass="btn-secondary btn-sm"><UserForm u={u} roles={roles} staff={staff} /></Modal>
            <ResetLink action={resetLinkAction} id={u.id} />
            {u.failed_logins > 0 && <ActionForm action={unlockAction}><input type="hidden" name="id" value={u.id} /><SubmitButton className="btn-secondary btn-sm">Unlock</SubmitButton></ActionForm>}
            {u.sessions > 0 && <ActionForm action={revokeAction} confirm="Sign this user out everywhere?"><input type="hidden" name="id" value={u.id} /><SubmitButton className="btn-secondary btn-sm">Revoke sessions</SubmitButton></ActionForm>}
          </div></td></tr>)}</tbody></table></Card>
    </div>
  );
}
