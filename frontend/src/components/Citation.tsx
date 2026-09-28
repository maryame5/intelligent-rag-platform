import type { ReactNode } from "react";

export function CitedText({ children, index }: { children: ReactNode; index: number }) {
  return (
    <span className="inline-flex items-center gap-1 align-baseline">
      <mark className="rounded px-1 bg-orbite-soft text-nuit">{children}</mark>
      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-orbite text-[10px] font-medium text-nuit">
        {index}
      </span>
    </span>
  );
}

export function SourceCard({
  index,
  title,
  excerpt,
  location,
  children,
}: {
  index: number;
  title?: string;
  excerpt?: string;
  location?: string;
  children?: ReactNode;
}) {
  return (
    <div className="border-l-[3px] border-orbite bg-white p-4 text-sm leading-relaxed">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-braise">
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-orbite-soft text-nuit">
          {index}
        </span>
        {title}
      </div>
      {location ? <p className="mt-1 text-xs text-marine">{location}</p> : null}
      <p className="mt-2 text-nuit">{children ?? excerpt}</p>
    </div>
  );
}
