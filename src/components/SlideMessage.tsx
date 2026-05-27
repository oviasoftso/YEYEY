import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import { Button } from "@/components/ui/button";
import { sanitizeMarkdown } from "@/lib/sanitize-markdown";

const tableComponents = {
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="my-3 w-full overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }: { children?: React.ReactNode }) => (
    <thead className="bg-muted">{children}</thead>
  ),
  tbody: ({ children }: { children?: React.ReactNode }) => (
    <tbody className="[&>tr:nth-child(even)]:bg-muted/30">{children}</tbody>
  ),
  tr: ({ children }: { children?: React.ReactNode }) => (
    <tr className="border-b border-border last:border-b-0">{children}</tr>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="border-r border-border last:border-r-0 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-foreground">
      {children}
    </th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="border-r border-border last:border-r-0 px-3 py-2 text-sm text-foreground align-top">
      {children}
    </td>
  ),
};

interface SlideMessageProps {
  content: string;
  isStreaming?: boolean;
}

/** Split markdown content into slides by --- or ## headings */
function splitIntoSlides(content: string): string[] {
  // Split on horizontal rules first
  let parts = content.split(/\n---\n/).map((s) => s.trim()).filter(Boolean);

  // If no HR splits found, split on ## headings
  if (parts.length <= 1) {
    const headingSplit = content.split(/(?=^## )/m).map((s) => s.trim()).filter(Boolean);
    if (headingSplit.length > 1) parts = headingSplit;
  }

  // If still 1 chunk, split on paragraphs (every ~3 paragraphs)
  if (parts.length <= 1 && content.length > 300) {
    const paragraphs = content.split(/\n\n+/).filter((p) => p.trim());
    if (paragraphs.length > 2) {
      const chunkSize = Math.ceil(paragraphs.length / Math.ceil(paragraphs.length / 3));
      parts = [];
      for (let i = 0; i < paragraphs.length; i += chunkSize) {
        parts.push(paragraphs.slice(i, i + chunkSize).join("\n\n"));
      }
    }
  }

  return parts.length > 0 ? parts : [content];
}

const markdownClasses = `
  prose prose-sm max-w-none
  text-foreground
  prose-headings:font-display prose-headings:text-foreground prose-headings:mt-3 prose-headings:mb-2 prose-headings:first:mt-0
  prose-h2:text-base prose-h2:font-bold prose-h2:border-b prose-h2:border-border prose-h2:pb-1
  prose-h3:text-sm prose-h3:font-semibold
  prose-p:text-sm prose-p:leading-relaxed prose-p:text-foreground prose-p:my-1.5
  prose-strong:text-foreground prose-strong:font-semibold
  prose-ul:my-2 prose-ul:text-sm prose-ol:my-2 prose-ol:text-sm
  prose-li:my-0.5 prose-li:text-foreground
  prose-blockquote:border-l-primary prose-blockquote:bg-primary/5 prose-blockquote:rounded-r-lg prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:not-italic prose-blockquote:text-sm prose-blockquote:my-3
  prose-code:bg-muted prose-code:text-foreground prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:before:content-none prose-code:after:content-none
  prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-xl prose-pre:my-3
  prose-hr:border-border prose-hr:my-4
  prose-a:text-primary prose-a:no-underline hover:prose-a:underline
  [&_.katex-display]:my-3 [&_.katex-display]:overflow-x-auto [&_.katex-display]:py-2
  [&_.katex]:text-foreground
`;

const SlideMessage = ({ content, isStreaming }: SlideMessageProps) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const cleanedContent = sanitizeMarkdown(content);
  const slides = splitIntoSlides(cleanedContent);
  const totalSlides = slides.length;
  const isSingleSlide = totalSlides <= 1;

  const goNext = () => setCurrentSlide((i) => Math.min(i + 1, totalSlides - 1));
  const goPrev = () => setCurrentSlide((i) => Math.max(i - 1, 0));

  // While streaming, always show the last slide
  const activeSlide = isStreaming ? totalSlides - 1 : currentSlide;

  if (isSingleSlide) {
    return (
      <div className={markdownClasses}>
        <ReactMarkdown
          remarkPlugins={[remarkMath, remarkGfm]}
          rehypePlugins={[rehypeKatex]}
          components={tableComponents}
        >
          {cleanedContent}
        </ReactMarkdown>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSlide}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className={markdownClasses}
        >
          <ReactMarkdown
            remarkPlugins={[remarkMath, remarkGfm]}
            rehypePlugins={[rehypeKatex]}
            components={tableComponents}
          >
            {slides[activeSlide]}
          </ReactMarkdown>
        </motion.div>
      </AnimatePresence>

      {/* Slide navigation */}
      {!isStreaming && (
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <Button
            variant="ghost"
            size="sm"
            onClick={goPrev}
            disabled={activeSlide === 0}
            className="h-7 px-2 text-xs gap-1"
          >
            <ChevronLeft size={14} /> Back
          </Button>

          <div className="flex items-center gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === activeSlide
                    ? "bg-primary w-4"
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
              />
            ))}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={goNext}
            disabled={activeSlide === totalSlides - 1}
            className="h-7 px-2 text-xs gap-1"
          >
            Next <ChevronRight size={14} />
          </Button>
        </div>
      )}
    </div>
  );
};

export default SlideMessage;
