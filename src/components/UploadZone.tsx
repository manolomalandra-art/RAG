"use client";

import { useRef, useState } from "react";
import { Upload, FileSpreadsheet, CheckCircle } from "lucide-react";
import { parseFile } from "@/lib/parseFile";

interface UploadZoneProps {
  title: string;
  desc: string;
  hint: string;
  rowsLabel: string;
  onParsed: (data: Record<string, unknown>[]) => void;
  disabled?: boolean;
}

export default function UploadZone({
  title,
  desc,
  hint,
  rowsLabel,
  onParsed,
  disabled,
}: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rowCount, setRowCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const data = await parseFile(file);
      setFileName(file.name);
      setRowCount(data.length);
      onParsed(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error parsing file");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={`relative flex flex-col rounded-2xl border-2 border-dashed p-6 transition-all duration-200 ${
        disabled
          ? "border-gray-700 bg-gray-900/40 opacity-50 cursor-not-allowed"
          : fileName
          ? "border-emerald-500/60 bg-emerald-950/20"
          : "border-gray-600 bg-gray-900/60 hover:border-blue-500/60 hover:bg-blue-950/10"
      }`}
    >
      <div className="flex items-start gap-3 mb-3">
        <div
          className={`mt-0.5 rounded-xl p-2.5 ${
            fileName ? "bg-emerald-500/20" : "bg-blue-500/15"
          }`}
        >
          {fileName ? (
            <CheckCircle className="h-5 w-5 text-emerald-400" />
          ) : (
            <FileSpreadsheet className="h-5 w-5 text-blue-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-100">{title}</h3>
          <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{desc}</p>
        </div>
      </div>

      {!disabled && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleChange}
            className="hidden"
          />
          <button
            onClick={() => inputRef.current?.click()}
            disabled={loading}
            className="mt-auto flex items-center justify-center gap-2 rounded-xl bg-blue-600/20 border border-blue-500/30 px-4 py-2.5 text-xs font-medium text-blue-300 hover:bg-blue-600/30 hover:border-blue-400/50 transition-all disabled:opacity-50"
          >
            <Upload className="h-3.5 w-3.5" />
            {loading ? "..." : "CSV / Excel"}
          </button>
        </>
      )}

      {fileName && (
        <div className="mt-3 rounded-lg bg-emerald-950/40 border border-emerald-700/30 px-3 py-2">
          <p className="text-xs text-emerald-300 font-medium truncate">{fileName}</p>
          {rowCount !== null && (
            <p className="text-[11px] text-emerald-400/70 mt-0.5">
              {rowCount} {rowsLabel}
            </p>
          )}
        </div>
      )}

      {!fileName && !disabled && (
        <p className="mt-2 text-[11px] text-gray-500 italic">{hint}</p>
      )}

      {error && (
        <p className="mt-2 text-[11px] text-red-400">{error}</p>
      )}

      {disabled && (
        <p className="mt-2 text-[11px] text-gray-500 italic">{hint}</p>
      )}
    </div>
  );
}
