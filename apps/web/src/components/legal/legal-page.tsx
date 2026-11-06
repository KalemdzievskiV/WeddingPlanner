import type { Locale } from "@svadba/shared";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import type { LegalDoc } from "@/content/legal/types";
import { Alert } from "@/components/ui/alert";
import { Stitch } from "@/components/ui/stitch";
import { formatDate } from "@/lib/format";

type Block = { kind: "h2"; text: string; id?: string } | { kind: "p"; text: string } | { kind: "ul"; items: string[] };

/** Parses the simple text format described in content/legal/types.ts. */
function parse(body: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length) blocks.push({ kind: "p", text: paragraph.join(" ") });
    paragraph = [];
  };
  for (const raw of body.split("\n")) {
    const line = raw.trim();
    if (!line) {
      flush();
    } else if (line.startsWith("## ")) {
      flush();
      const m = line.slice(3).match(/^(.*?)\s*\{#([a-z0-9-]+)\}$/);
      blocks.push(m ? { kind: "h2", text: m[1]!, id: m[2]! } : { kind: "h2", text: line.slice(3) });
    } else if (line.startsWith("- ")) {
      flush();
      const last = blocks.at(-1);
      if (last?.kind === "ul") last.items.push(line.slice(2));
      else blocks.push({ kind: "ul", items: [line.slice(2)] });
    } else {
      paragraph.push(line);
    }
  }
  flush();
  return blocks;
}

export async function LegalPage({ doc, title, locale }: { doc: LegalDoc; title: string; locale: Locale }) {
  const t = await getTranslations("legal");
  const content: ReactNode[] = parse(doc.body[locale]).map((b, i) =>
    b.kind === "h2" ? (
      <h2 key={i} id={b.id} className="mt-10 scroll-mt-24 font-display text-2xl">
        {b.text}
      </h2>
    ) : b.kind === "ul" ? (
      <ul key={i} className="mt-3 list-disc space-y-1.5 pl-5">
        {b.items.map((item, j) => (
          <li key={j}>{item}</li>
        ))}
      </ul>
    ) : (
      <p key={i} className="mt-3">
        {b.text}
      </p>
    ),
  );

  return (
    <main id="main" className="mx-auto max-w-2xl px-4 pt-10 sm:px-6">
      <h1 className="font-display text-4xl sm:text-5xl">{title}</h1>
      {doc.updated && <p className="mt-3 text-sm tabular-nums text-stone">{t("updated", { date: formatDate(doc.updated) })}</p>}
      <Stitch className="mt-6 w-32" />
      {doc.draft && <Alert className="mt-8">{t("draft")}</Alert>}
      <div className="leading-relaxed text-ink-soft">{content}</div>
    </main>
  );
}
