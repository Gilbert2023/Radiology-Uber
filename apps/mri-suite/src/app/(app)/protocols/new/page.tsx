import { Layers } from "lucide-react";
import { requireActor } from "@/server/auth";
import { PageHeader } from "@/components/ui";
import { ProtocolForm } from "@/components/client/ProtocolForm";
import { createProtocolAction } from "../actions";
export default async function NewProtocol() {
  await requireActor("protocols.edit");
  return <div><PageHeader title="New MRI protocol" icon={Layers} crumbs={[{ label: "Protocol Library", href: "/protocols" }, { label: "New" }]} /><ProtocolForm action={createProtocolAction} /></div>;
}
