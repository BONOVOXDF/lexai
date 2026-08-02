"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownProps {
  content: string;
  className?: string;
}

/** Renderiza texto Markdown com estilos da plataforma (Github Flavored). */
export function Markdown({ content, className }: MarkdownProps) {
  return (
    <div className={cn("markdown-body text-sm", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
