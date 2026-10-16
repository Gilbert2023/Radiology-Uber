import { ExternalLink } from "lucide-react";
import { referenceById } from "@/content/references";
import { Badge } from "@/components/ui";

export function ReferenceList({ ids, compact = false }: { ids: string[]; compact?: boolean }) {
  const refs = ids.map((id) => referenceById[id]).filter(Boolean);
  return (
    <ol className="space-y-3">
      {refs.map((r) => (
        <li key={r.id} className="text-sm">
          <p className="text-slate-100">
            {r.url ? (
              <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-1 hover:text-cyan-300">
                {r.title}
                <ExternalLink className="mt-1 h-3 w-3 shrink-0" aria-label="(opens in new tab)" />
              </a>
            ) : (
              r.title
            )}
          </p>
          <p className="text-xs text-slate-400">
            {r.publisher} · {r.date}
          </p>
          {!compact && r.note && <p className="mt-1 text-xs text-slate-400">{r.note}</p>}
          {r.verify && (
            <Badge tone="warn" className="mt-1">
              Verify against latest edition
            </Badge>
          )}
        </li>
      ))}
    </ol>
  );
}
