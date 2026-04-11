"use client";
import Link from "next/link";

interface InfoTipProps {
  text: string;
  link?: string;
  linkLabel?: string;
}

export function InfoTip({ text, link, linkLabel }: InfoTipProps) {
  return (
    <span className="relative inline-flex items-center group ml-1">
      <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-muted text-muted-foreground text-[9px] font-bold cursor-help select-none border border-muted-foreground/20 hover:bg-accent hover:text-accent-foreground transition-colors">
        ?
      </span>
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 bg-popover text-popover-foreground text-[11px] leading-tight rounded-md shadow-md border border-border max-w-[250px] w-max opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50 pointer-events-none group-hover:pointer-events-auto">
        {text}
        {link && (
          <>
            {" "}
            <Link href={link} className="text-primary hover:underline whitespace-nowrap">
              {linkLabel || "Learn more"}
            </Link>
          </>
        )}
        <span className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-border" />
      </span>
    </span>
  );
}
