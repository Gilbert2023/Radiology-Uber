import Link from "next/link";
export default function NotFound() {
  return (
    <div className="py-16">
      <h1 className="font-serif text-3xl font-semibold">Page not found</h1>
      <p className="mt-2 text-ink-600">The page you requested does not exist. Try the <Link href="/search/">search</Link> or return to the <Link href="/">dashboard</Link>.</p>
    </div>
  );
}
