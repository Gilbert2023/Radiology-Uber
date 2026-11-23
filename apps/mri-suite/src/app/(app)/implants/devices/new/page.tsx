import { Database } from "lucide-react";
import { requireActor } from "@/server/auth";
import { listImplantCategories } from "@/server/queries";
import { PageHeader, Card } from "@/components/ui";
import { ActionForm, SubmitButton } from "@/components/client/forms";
import { DeviceFields } from "@/components/DeviceFields";
import { saveDeviceAction } from "../../actions";
export default async function NewDevice() {
  await requireActor("implants.configure");
  return (
    <div className="max-w-5xl">
      <PageHeader title="Add device model" icon={Database} crumbs={[{ label: "Implant Registry", href: "/implants" }, { label: "Database", href: "/implants/devices" }, { label: "New" }]} />
      <Card><ActionForm action={saveDeviceAction} className="space-y-4"><DeviceFields categories={await listImplantCategories()} /><SubmitButton>Save (unverified)</SubmitButton></ActionForm></Card>
    </div>
  );
}
