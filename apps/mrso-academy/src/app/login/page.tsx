import type { Metadata } from "next";
import { Container } from "@/components/ui";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <Container className="flex min-h-[70vh] items-center justify-center py-12">
      <LoginForm />
    </Container>
  );
}
