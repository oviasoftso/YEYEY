/**
 * Sanitize AI-generated content so it renders cleanly with react-markdown + KaTeX.
 *
 * Math inside $...$, $$...$$, \(...\), \[...\] is preserved; all surrounding
 * LaTeX text-mode commands and HTML tables are converted to GFM markdown.
 */

const MATH_PLACEHOLDER = "\u0000MATH\u0000";

function convertLatexTextCommands(input: string): string {
  let out = input;

  // Sectioning → markdown headings
  out = out.replace(/\\section\*?\{([^{}]+)\}/g, "## $1");
  out = out.replace(/\\subsection\*?\{([^{}]+)\}/g, "### $1");
  out = out.replace(/\\subsubsection\*?\{([^{}]+)\}/g, "#### $1");
  out = out.replace(/\\paragraph\*?\{([^{}]+)\}/g, "**$1**");
  out = out.replace(/\\chapter\*?\{([^{}]+)\}/g, "# $1");
  out = out.replace(/\\title\{([^{}]+)\}/g, "# $1");

  // Bold / italic / emphasis
  out = out.replace(/\\textbf\{([^{}]+)\}/g, "**$1**");
  out = out.replace(/\\textit\{([^{}]+)\}/g, "*$1*");
  out = out.replace(/\\emph\{([^{}]+)\}/g, "*$1*");
  out = out.replace(/\\underline\{([^{}]+)\}/g, "**$1**");
  out = out.replace(/\\textsc\{([^{}]+)\}/g, "**$1**");
  out = out.replace(/\\texttt\{([^{}]+)\}/g, "`$1`");
  out = out.replace(/\\textrm\{([^{}]+)\}/g, "$1");
  out = out.replace(/\\textsf\{([^{}]+)\}/g, "$1");
  out = out.replace(/\\textnormal\{([^{}]+)\}/g, "$1");
  out = out.replace(/\\mbox\{([^{}]+)\}/g, "$1");
  out = out.replace(/\\mathrm\{([^{}]+)\}/g, "$1");

  // Lists / environments
  out = out.replace(/\\begin\{itemize\}/g, "");
  out = out.replace(/\\end\{itemize\}/g, "");
  out = out.replace(/\\begin\{enumerate\}/g, "");
  out = out.replace(/\\end\{enumerate\}/g, "");
  out = out.replace(/\\begin\{document\}/g, "");
  out = out.replace(/\\end\{document\}/g, "");
  out = out.replace(/\\begin\{center\}/g, "");
  out = out.replace(/\\end\{center\}/g, "");
  out = out.replace(/\\item\s+/g, "- ");

  // Spacing / line breaks
  out = out.replace(/\\\\(?!\w)/g, "  \n");
  out = out.replace(/\\newline/g, "  \n");
  out = out.replace(/\\par\b/g, "\n\n");
  out = out.replace(/\\hfill/g, " ");
  out = out.replace(/\\quad/g, " ");
  out = out.replace(/\\qquad/g, "  ");
  out = out.replace(/\\noindent/g, "");
  out = out.replace(/\\bigskip/g, "\n\n");
  out = out.replace(/\\medskip/g, "\n\n");
  out = out.replace(/\\smallskip/g, "\n\n");

  // Strip preamble noise
  out = out.replace(/\\documentclass(\[[^\]]*\])?\{[^}]*\}/g, "");
  out = out.replace(/\\usepackage(\[[^\]]*\])?\{[^}]*\}/g, "");
  out = out.replace(/\\maketitle/g, "");

  return out;
}

function convertHtmlTables(input: string): string {
  return input.replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, (_m, inner: string) => {
    const rowMatches = [...inner.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
    if (rowMatches.length === 0) return "";

    const rows: string[][] = rowMatches.map((m) => {
      const cellMatches = [...m[1].matchAll(/<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi)];
      return cellMatches.map((c) =>
        c[1].replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim(),
      );
    });

    if (rows.length === 0 || rows[0].length === 0) return "";
    const colCount = Math.max(...rows.map((r) => r.length));
    const padded = rows.map((r) => {
      const c = [...r];
      while (c.length < colCount) c.push("");
      return c;
    });

    const sep = Array(colCount).fill("---");
    const renderRow = (cells: string[]) => `| ${cells.join(" | ")} |`;
    return ["", renderRow(padded[0]), renderRow(sep), ...padded.slice(1).map(renderRow), ""].join("\n");
  });
}

export function sanitizeMarkdown(input: string | null | undefined): string {
  if (!input) return "";
  let text = String(input);

  // \( ... \) → $ ... $   and   \[ ... \] → $$ ... $$
  text = text.replace(/\\\(([\s\S]+?)\\\)/g, (_m, body) => `$${body}$`);
  text = text.replace(/\\\[([\s\S]+?)\\\]/g, (_m, body) => `$$${body}$$`);

  const mathBuckets: string[] = [];
  const stash = (raw: string) => {
    mathBuckets.push(raw);
    return `${MATH_PLACEHOLDER}${mathBuckets.length - 1}${MATH_PLACEHOLDER}`;
  };

  text = text.replace(/\$\$[\s\S]+?\$\$/g, (m) => stash(m));
  text = text.replace(/(?<!\\)\$[^\n$]+?\$/g, (m) => stash(m));

  text = convertHtmlTables(text);
  text = convertLatexTextCommands(text);

  text = text.replace(
    new RegExp(`${MATH_PLACEHOLDER}(\\d+)${MATH_PLACEHOLDER}`, "g"),
    (_m, idx) => mathBuckets[Number(idx)] ?? "",
  );

  return text;
}
