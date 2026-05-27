import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { sanitizeMarkdown } from "@/lib/sanitize-markdown";

interface LatexTextProps {
  children: string;
  className?: string;
}

const LatexText = ({ children, className = "" }: LatexTextProps) => {
  const safe = sanitizeMarkdown(children);

  return (
    <div className={`prose prose-sm max-w-none dark:prose-invert
      prose-p:my-1 prose-p:leading-relaxed
      prose-headings:text-foreground prose-headings:font-display
      prose-h1:text-xl prose-h1:font-bold prose-h1:mt-4 prose-h1:mb-2
      prose-h2:text-lg prose-h2:font-bold prose-h2:mt-3 prose-h2:mb-2
      prose-h3:text-base prose-h3:font-semibold prose-h3:mt-2 prose-h3:mb-1
      prose-strong:text-foreground prose-strong:font-semibold
      prose-em:text-foreground
      prose-ul:my-1 prose-ol:my-1
      prose-li:my-0.5 prose-li:marker:text-muted-foreground
      prose-code:bg-muted prose-code:text-foreground prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:before:content-none prose-code:after:content-none
      prose-blockquote:border-l-primary prose-blockquote:bg-primary/5 prose-blockquote:py-1 prose-blockquote:px-3 prose-blockquote:rounded-r-md prose-blockquote:not-italic
      [&_.katex-display]:my-2 [&_.katex-display]:overflow-x-auto
      [&_.katex]:text-foreground
      ${className}`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        components={{
          table: ({ children }) => (
            <div className="my-3 w-full overflow-x-auto rounded-lg border border-border">
              <table className="w-full border-collapse text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted">{children}</thead>
          ),
          tbody: ({ children }) => (
            <tbody className="[&>tr:nth-child(even)]:bg-muted/30">{children}</tbody>
          ),
          tr: ({ children }) => (
            <tr className="border-b border-border last:border-b-0">{children}</tr>
          ),
          th: ({ children }) => (
            <th className="border-r border-border last:border-r-0 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-foreground">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-r border-border last:border-r-0 px-3 py-2 text-sm text-foreground align-top">
              {children}
            </td>
          ),
        }}
      >
        {safe}
      </ReactMarkdown>
    </div>
  );
};

export default LatexText;
