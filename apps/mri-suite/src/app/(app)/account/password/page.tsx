import { redirect } from "next/navigation";
import { KeyRound } from "lucide-react";
import { getActor } from "@/server/auth";
import { PageHeader, Card, Notice } from "@/components/ui";
import { PASSWORD_RULE } from "@/server/services/admin";
import { PasswordForm } from "./PasswordForm";
export const metadata = { title: "Change password" };
export default async function Page({ searchParams }: { searchParams: Promise<{ required?: string }> }) {
  const a = await getActor();
  if (!a) redirect("/login");
  const { required } = await searchParams;
  return (
    <div className="max-w-lg">
      <PageHeader title="Change password" icon={KeyRound} description={PASSWORD_RULE} />
      {(required || a.mustChangePassword) && <Notice tone="warning" className="mb-4" title="Password change required">You must set a new password before using the system.</Notice>}
      <Card><PasswordForm /></Card>
    </div>
  );
}
