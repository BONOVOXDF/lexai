"use client";

import * as React from "react";
import { Download, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, API_URL } from "@/lib/api";
import { formatBytes } from "@/lib/utils";
import type { Documento } from "@/lib/types";

/** Componente de upload de arquivos com arrastar e soltar. */
export function FileUpload({
  onUpload,
  accept = ".pdf,.docx,.png,.jpg,.jpeg,.txt",
  multiple = false,
  label = "Arraste arquivos aqui ou clique para enviar",
}: {
  onUpload?: (files: FileList) => void;
  accept?: string;
  multiple?: boolean;
  label?: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);

  const handleFiles = (files: FileList | null) => {
    if (files && files.length > 0 && onUpload) onUpload(files);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
        dragging
          ? "border-gold bg-gold/10"
          : "border-muted bg-muted/30 hover:border-navy/40 hover:bg-muted/50"
      }`}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-navy/10 text-navy">
        <Paperclip className="h-6 w-6" />
      </div>
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-muted-foreground">PDF, DOCX, PNG, JPG, TXT</p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}

/** Botão de download de um documento. */
export function DocumentDownloadButton({ documento }: { documento: Documento }) {
  const [loading, setLoading] = React.useState(false);

  const download = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("lexai_access_token") ?? "";
      const res = await fetch(
        `${API_URL}/api/documentos/${documento.id}/download`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Falha no download");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = documento.nome_original;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="ghost" size="iconSm" onClick={download} disabled={loading} aria-label="Baixar arquivo">
      <Download className="h-4 w-4" />
    </Button>
  );
}
