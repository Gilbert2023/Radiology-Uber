import { Container, LinkButton } from "@/components/ui";
import { SafetySign } from "@/components/art/SafetySign";

export default function NotFound() {
  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <SafetySign kind="mr-unsafe" size={80} />
      <h1 className="mt-6 text-3xl font-bold text-white">Restricted area — page not found</h1>
      <p className="mt-2 text-slate-400">The page you are looking for does not exist or has moved.</p>
      <div className="mt-6 flex gap-3">
        <LinkButton href="/">Home</LinkButton>
        <LinkButton href="/curriculum/" variant="secondary">Curriculum</LinkButton>
      </div>
    </Container>
  );
}
