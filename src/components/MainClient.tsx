"use client";

import { useState, useCallback } from "react";
import { useLang } from "@/context/LangContext";
import LanguageModal from "@/components/LanguageModal";
import UploadZone from "@/components/UploadZone";
import ReportPDF, { ReportItem } from "@/components/ReportPDF";
import { callAnalyzeHealth } from "@/lib/supabase";
import { Globe, FileText, Loader2, AlertCircle } from "lucide-react";
import { PDFViewer } from "@react-pdf/renderer";

export default function Home() {
  const { t, lang } = useLang();
  const [langModalOpen, setLangModalOpen] = useState(false);
  const [financialData, setFinancialData] = useState<Record<string, unknown>[] | null>(null);
  const [tribologyData, setTribologyData] = useState<Record<string, unknown>[] | null>(null);
  const [processing, setProcessing] = useState(false);
  const [reportItems, setReportItems] = useState<ReportItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canProcess = financialData !== null || tribologyData !== null;

  const handleProcess = useCallback(async () => {
    if (!canProcess) return;
    setProcessing(true);
    setError(null);
    setReportItems(null);
    try {
      const result = await callAnalyzeHealth({
        financial: financialData || [],
        tribology: tribologyData || [],
        lang,
      });
      setReportItems(result.items as ReportItem[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error processing data");
    } finally {
      setProcessing(false);
    }
  }, [canProcess, financialData, tribologyData, lang]);

  const now = new Date().toLocaleString(lang === "pt" ? "pt-BR" : lang === "es" ? "es-AR" : "en-US");

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-gray-100">
      {/* Top bar */}
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

      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* Upload grid */}
        {!reportItems && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <UploadZone
                title={t.zones.financial.title}
                desc={t.zones.financial.desc}
                hint={t.zones.financial.hint}
                rowsLabel={t.zones.financial.rows}
                onParsed={setFinancialData}
              />
              <UploadZone
                title={t.zones.tribology.title}
                desc={t.zones.tribology.desc}
                hint={t.zones.tribology.hint}
                rowsLabel={t.zones.tribology.rows}
                onParsed={setTribologyData}
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

            {/* Process button */}
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

        {/* Error */}
        {error && (
          <div className="mt-6 flex items-center gap-2 rounded-xl bg-red-950/40 border border-red-700/40 px-4 py-3 text-sm text-red-300 max-w-xl mx-auto">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Report preview */}
        {reportItems && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-200">
                {t.report.title}
              </h2>
              <div className="flex gap-3">
                <button
                  onClick={() => setReportItems(null)}
                  className="rounded-xl bg-gray-800 border border-gray-700 px-4 py-2 text-xs font-medium text-gray-300 hover:bg-gray-700 transition-all"
                >
                  {t.back}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-700/50 bg-white overflow-hidden" style={{ height: "75vh" }}>
              <PDFViewer width="100%" height="100%" showToolbar={true}>
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
                    recommendation: t.report.recommendation,
                    footer: t.report.footer,
                  }}
                />
              </PDFViewer>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-12 pb-8 text-center">
          <p className="text-[11px] text-gray-600">{t.poweredBy}</p>
          <p className="text-[11px] text-gray-700">{t.supabase}</p>
        </footer>
      </main>
    </div>
  );
}
