import { Callout } from "@/components/ui";

export function AccountsOff() {
  return (
    <Callout tone="info" title="Accounts are not switched on for this copy of the site">
      This build is running in local demonstration mode. To enable sign-up, cloud-saved progress and the admin area, connect a Supabase project by setting
      NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY and rebuilding — see DEPLOY.md.
    </Callout>
  );
}
