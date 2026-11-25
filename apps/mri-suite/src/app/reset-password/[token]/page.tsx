import { HospitalLogo } from "@/components/brand";
import { ResetForm } from "./ResetForm";
import { PASSWORD_RULE } from "@/server/services/admin";
export const metadata = { title: "Reset password" };
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="card card-pad w-full max-w-sm">
        <HospitalLogo />
        <h1 className="mt-6 text-xl font-bold">Set a new password</h1>
        <p className="mt-1 text-sm text-slate-500">{PASSWORD_RULE}</p>
        <ResetForm token={token} />
      </div>
    </main>
  );
}
