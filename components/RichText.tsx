import React from "react";

/**
 * Safe renderer for the small markdown subset TENDA AI is asked to produce
 * (BACKEND_README.md §15.1): paragraphs, **bold**, "- " bullets, numbered
 * lists and GitHub-style tables. Everything is rendered as React text nodes,
 * so model output can never inject HTML.
 */

function inline(text: string, keyPrefix: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
      <strong key={`${keyPrefix}-${i}`} className="text-[#E85D04] font-semibold">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <React.Fragment key={`${keyPrefix}-${i}`}>{part}</React.Fragment>
    )
  );
}

const isTableRow = (line: string) => /^\s*\|.*\|\s*$/.test(line);
const isDivider = (line: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line);
const cells = (line: string) =>
  line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());

export default function RichText({ text, className = "" }: { text: string; className?: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    // Table
    if (isTableRow(line) && i + 1 < lines.length && isDivider(lines[i + 1])) {
      const header = cells(line);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && isTableRow(lines[i])) rows.push(cells(lines[i++]));
      blocks.push(
        <div key={`t${i}`} className="rounded-xl border border-[#E8E8E4] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-[#FFF0E6]">
                  {header.map((h, j) => (
                    <th
                      key={j}
                      className="px-4 py-2.5 text-left text-xs font-semibold text-[#E85D04] uppercase tracking-wider whitespace-nowrap"
                    >
                      {inline(h, `th${j}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white">
                {rows.map((row, r) => (
                  <tr key={r} className="border-t border-[#E8E8E4]">
                    {row.map((cell, c) => (
                      <td key={c} className="px-4 py-2.5 text-[#2D3748] whitespace-nowrap">
                        {inline(cell, `td${r}-${c}`)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
      continue;
    }

    // Bulleted / numbered list
    const bullet = /^\s*(?:[-*•]|\d+[.)])\s+/;
    if (bullet.test(line)) {
      const ordered = /^\s*\d+[.)]/.test(line);
      const items: string[] = [];
      while (i < lines.length && bullet.test(lines[i])) items.push(lines[i++].replace(bullet, ""));
      const ListTag = ordered ? "ol" : "ul";
      blocks.push(
        <ListTag key={`l${i}`} className={`space-y-1 pl-5 ${ordered ? "list-decimal" : "list-disc"} marker:text-[#E85D04]`}>
          {items.map((item, j) => (
            <li key={j} className="text-sm text-[#2D3748] leading-relaxed">
              {inline(item, `li${i}-${j}`)}
            </li>
          ))}
        </ListTag>
      );
      continue;
    }

    // Heading (### Title) → bold paragraph
    if (/^#{1,6}\s+/.test(line)) {
      blocks.push(
        <p key={`h${i}`} className="text-sm font-bold text-[#1A1A1A]">
          {inline(line.replace(/^#{1,6}\s+/, ""), `h${i}`)}
        </p>
      );
      i++;
      continue;
    }

    // Paragraph: consecutive non-special lines
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !bullet.test(lines[i]) &&
      !/^#{1,6}\s+/.test(lines[i]) &&
      !(isTableRow(lines[i]) && i + 1 < lines.length && isDivider(lines[i + 1]))
    ) {
      para.push(lines[i++]);
    }
    blocks.push(
      <p key={`p${i}`} className="text-sm text-[#2D3748] leading-relaxed whitespace-pre-line">
        {inline(para.join("\n"), `p${i}`)}
      </p>
    );
  }

  return <div className={`space-y-3 ${className}`}>{blocks}</div>;
}

/** Plain text version (for copy-to-clipboard and speech). */
export function toPlainText(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*\|?\s*:?-{2,}.*$/gm, "")
    .replace(/\|/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}
