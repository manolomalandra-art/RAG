"use client";

import { useState, useCallback, useRef } from "react";
import { useLang } from "@/context/LangContext";
import LanguageModal from "@/components/LanguageModal";
import UploadZone from "@/components/UploadZone";
import ReportPDF, { ReportItem } from "@/components/ReportPDF";
import {
  crossReference,
  type TribologyRow,
  type FinancialRow,
} from "@/lib/parseFile";
import { supabase } from "@/lib/supabase";
import { Globe, FileText, Loader2, AlertCircle, Download } from "lucide-react";
import { pdf } from "@react-pdf/renderer";

export default function MainClient() {
  const { t, lang } = useLang();
  const [langModalOpen, setLangModalOpen] = useState(false);
  const [tribologyData, setTribologyData] = useState<TribologyRow[] | null>(null);
  const [financialData, setFinancialData] = useState<FinancialRow[] | null>(null);
  const [processing, setProcessing] = useState(false);
  const [reportItems, setReportItems] = useState<ReportItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const downloadRef = useRef<HTMLAnchorElement>(null);

  const canProcess = tribologyData !== null || financialData !== null;

  const handleTribologyParsed = useCallback((data: Record<string, unknown>[]) => {
    // Data is already parsed as TribologyRow[] from the new parser
    setTribologyData(data as unknown as TribologyRow[]);
  }, []);

  const handleFinancialParsed = useCallback((data: Record<string, unknown>[]) => {
    setFinancialData(data as unknown as FinancialRow[]);
  }, []);

  const handleProcess = useCallback(async () => {
    if (!canProcess) return;
    setProcessing(true);
    setError(null);
    setReportItems(null);

    try {
      // Cross-reference tribology with financial data
      const items = crossReference(
        tribologyData || [],
        financialData || []
      );

      if (items.length === 0) {
        setError(t.noData);
        setProcessing(false);
        return;
      }

      // Send to Edge Function for AI analysis
      const { data, error: fnError } = await supabase.functions.invoke(
        "analyze-health",
        {
          body: { items, lang },
        }
      );

      if (fnError) throw fnError;
      setReportItems(data.items as ReportItem[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error processing data");
    } finally {
      setProcessing(false);
    }
  }, [canProcess, tribologyData, financialData, lang, t]);

  const handleDownloadPdf = useCallback(async () => {
    if (!reportItems) return;

    const now = new Date().toLocaleString(
      lang === "pt" ? "pt-BR" : lang === "es" ? "es-AR" : "en-US"
    );

    const blob = await pdf(
      <ReportPDF
        items={reportItems}
        generatedAt={now}
        labels={{
          title: t.report.title,
          generated: t.report.generated,
          summary: t.report.summary,
          equipment: t.report.equipment,
          status: t.report.status,
          healthy: t.report.healthy,
          replacement: t.report.replacement,
          cost: t.report.cost,
          evaluation: t.report.evaluation || "Evaluación",
          recommendation: t.report.recommendation,
          footer: t.report.footer,
        }}
      />
    ).toBlob();

    const url = URL.createObjectURL(blob);
    if (downloadRef.current) {
      downloadRef.current.href = url;
      downloadRef.current.download = `reporte-industrial-${Date.now()}.pdf`;
      downloadRef.current.click();
      URL.revokeObjectURL(url);
    }
  }, [reportItems, lang, t]);

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-gray-100">
      <header className="sticky top-0 z-40 border-b border-gray-800 bg-[#0a0e1a]/90 backdrop-blur-md">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">
              {t.title}
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">{t.subtitle}</p>
          </div>
          <button
            onClick={() => setLangModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-gray-800/70 border border-gray-700/50 px-4 py-2 text-xs font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-all"
          >
            <Globe className="h-4 w-4" />
            {t.lang}
          </button>
        </div>
      </header>

      <LanguageModal open={langModalOpen} onClose={() => setLangModalOpen(false)} />

      {/* Hidden download anchor */}
      <a ref={downloadRef} className="hidden" />

      <main className="mx-auto max-w-6xl px-6 py-8">
        {!reportItems && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <UploadZone
                title={t.zones.financial.title}
                desc={t.zones.financial.desc}
                hint={t.zones.financial.hint}
                rowsLabel={t.zones.financial.rows}
                onParsed={handleFinancialParsed}
                useFinancialParser
              />
              <UploadZone
                title={t.zones.tribology.title}
                desc={t.zones.tribology.desc}
                hint={t.zones.tribology.hint}
                rowsLabel={t.zones.tribology.rows}
                onParsed={handleTribologyParsed}
                useTribologyParser
              />
              <UploadZone
                title={t.zones.thermography.title}
                desc={t.zones.thermography.desc}
                hint={t.zones.thermography.hint}
                rowsLabel=""
                onParsed={() => {}}
                disabled
              />
              <UploadZone
                title={t.zones.vibrations.title}
                desc={t.zones.vibrations.desc}
                hint={t.zones.vibrations.hint}
                rowsLabel=""
                onParsed={() => {}}
                disabled
              />
            </div>

            <div className="mt-8 flex flex-col items-center gap-3">
              <button
                onClick={handleProcess}
                disabled={!canProcess || processing}
                className="flex items-center gap-2.5 rounded-2xl bg-blue-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-500 hover:shadow-blue-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t.processing}
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4" />
                    {t.process}
                  </>
                )}
              </button>
              {!canProcess && (
                <p className="text-xs text-gray-500 text-center max-w-md">
                  {t.noData}
                </p>
              )}
            </div>
          </>
        )}

        {error && (
          <div className="mt-6 flex items-center gap-2 rounded-xl bg-red-950/40 border border-red-700/40 px-4 py-3 text-sm text-red-300 max-w-xl mx-auto">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {reportItems && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-200">
                {t.report.title} — {reportItems.length} equipos
              </h2>
              <div className="flex gap-3">
                <button
                  onClick={() => setReportItems(null)}
                  className="rounded-xl bg-gray-800 border border-gray-700 px-4 py-2 text-xs font-medium text-gray-300 hover:bg-gray-700 transition-all"
                >
                  {t.back}
                </button>
                <button
                  onClick={handleDownloadPdf}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-all"
                >
                  <Download className="h-4 w-4" />
                  {t.downloadPdf}
                </button>
              </div>
            </div>

            {/* Preview table */}
            <div className="rounded-2xl border border-gray-700/50 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-800/80">
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">{t.report.equipment}</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Comp.</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">{t.report.status}</th>
                    <th className="text-right px-4 py-3 text-gray-400 font-medium">{t.report.cost}</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">{t.report.recommendation}</th>
                  </tr>
                </thead>
                <tbody>
                  {reportItems.map((item, idx) => (
                    <tr
                      key={idx}
                      className={`border-t border-gray-800/50 ${
                        item.status === "replacement"
                          ? "bg-red-950/10"
                          : "bg-emerald-950/10"
                      }`}
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-200">{item.equipment}</span>
                        {item.tag && (
                          <span className="block text-[11px] text-gray-500">{item.tag} | {item.site}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-400">{item.compartment}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                            item.status === "healthy"
                              ? "bg-emerald-900/50 text-emerald-300"
                              : "bg-red-900/50 text-red-300"
                          }`}
                        >
                          {item.status === "healthy" ? t.report.healthy : t.report.replacement}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`font-semibold ${
                            item.status === "healthy" ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          R$ {item.cost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 max-w-xs truncate">
                        {item.recommendation}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary bar */}
            <div className="mt-4 flex items-center gap-6 text-xs text-gray-400">
              <span>
                <span className="text-emerald-400 font-bold">
                  {reportItems.filter((i) => i.status === "healthy").length}
                </span>{" "}
                {t.report.healthy}
              </span>
              <span>
                <span className="text-red-400 font-bold">
                  {reportItems.filter((i) => i.status === "replacement").length}
                </span>{" "}
                {t.report.replacement}
              </span>
              <span>
                Total:{" "}
                <span className="text-red-400 font-bold">
                  R$ {reportItems
                    .reduce((s, i) => s + i.cost, 0)
                    .toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </span>
            </div>
          </div>
        )}

        <footer className="mt-12 pb-8 text-center">
          <p className="text-[11px] text-gray-600">{t.poweredBy}</p>
          <p className="text-[11px] text-gray-700">{t.supabase}</p>
        </footer>
      </main>
    </div>
  );
}
