"use client";

import { useEffect, useRef } from "react";
import { N, renderPhantom, toImageData, type PhantomOptions } from "@/lib/phantom";
import type { SimParams } from "@/lib/sim";

export function PhantomCanvas({ params, opts, size = 256, label, className = "" }: { params: SimParams; opts?: PhantomOptions; size?: number; label: string; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const key = JSON.stringify([params, opts]);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const off = document.createElement("canvas");
    off.width = N;
    off.height = N;
    const octx = off.getContext("2d");
    const ctx = c.getContext("2d");
    if (!octx || !ctx) return;
    octx.putImageData(toImageData(renderPhantom(params, opts), octx), 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(off, 0, 0, c.width, c.height);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <canvas
      ref={ref}
      width={size}
      height={size}
      role="img"
      aria-label={`${label} — synthetic digital phantom, educational illustration, not patient data`}
      className={`block h-auto w-full max-w-full rounded-sm bg-black ${className}`}
    />
  );
}
