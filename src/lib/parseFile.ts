import Papa from "papaparse";
import * as XLSX from "xlsx";

export interface TribologyRow {
  family: string;
  maker: string;
  model: string;
  tag: string;
  serial: string;
  compartmentName: string;
  compartmentType: string;
  hoursAtSampling: string;
  oilHours: string;
  site: string;
  status: string;
  evaluation: string;
  recommendation: string;
}

export interface FinancialRow {
  family: string;
  maker: string;
  model: string;
  compartmentType: string;
  partName: string;
  partCost: number;
  laborHours: number;
  laborRate: number;
  totalCost: number;
}

function parseNumber(val: unknown): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const cleaned = val.replace(/[^\d.,-]/g, "").replace(",", ".");
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

function mapValue(val: unknown): string {
  if (val === null || val === undefined) return "";
  return String(val).trim();
}

export function parseTribologyExcel(file: File): Promise<TribologyRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (raw.length < 2) {
          resolve([]);
          return;
        }

        const rows: TribologyRow[] = [];
        for (let i = 1; i < raw.length; i++) {
          const r = raw[i];
          const family = mapValue(r[10]);
          if (!family) continue;

          rows.push({
            family,
            maker: mapValue(r[11]),
            model: mapValue(r[12]),
            tag: mapValue(r[13]),
            serial: mapValue(r[14]),
            compartmentName: mapValue(r[17]),
            compartmentType: mapValue(r[18]),
            hoursAtSampling: mapValue(r[24]),
            oilHours: mapValue(r[25]),
            site: mapValue(r[36]),
            status: mapValue(r[39]),
            evaluation: mapValue(r[40]),
            recommendation: mapValue(r[42]),
          });
        }
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Error reading file"));
    reader.readAsArrayBuffer(file);
  });
}

export function parseFinancialCSV(file: File): Promise<FinancialRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows: FinancialRow[] = (results.data as Record<string, string>[]).map((r) => {
          const partCost = parseNumber(r["Preço Peça (R$)"]);
          const laborHours = parseNumber(r["Horas Homem (HH)"]);
          const laborRate = parseNumber(r["Custo Tarifa HH (R$)"]);
          return {
            family: (r["Familia de Equipamento"] || "").trim(),
            maker: (r["Fabricante"] || "").trim(),
            model: (r["Modelo de Equipamento"] || "").trim(),
            compartmentType: (r["Tipo de Compartimento"] || "").trim(),
            partName: (r["Nome da Peça Principal"] || "").trim(),
            partCost,
            laborHours,
            laborRate,
            totalCost: partCost + laborHours * laborRate,
          };
        });
        resolve(rows);
      },
      error: (err) => reject(err),
    });
  });
}

export function crossReference(
  tribology: TribologyRow[],
  financial: FinancialRow[]
) {
  // Group tribology by (family, model, compartmentType), keep worst status
  const severityRank: Record<string, number> = {
    Normal: 0,
    Caution: 1,
    Abnormal: 2,
    Severe: 3,
  };

  const grouped: Record<string, TribologyRow[]> = {};
  for (const row of tribology) {
    const key = `${row.family}|${row.model}|${row.compartmentType}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(row);
  }

  // Build financial lookup by (family, model, compartmentType)
  const costLookup: Record<string, FinancialRow[]> = {};
  for (const row of financial) {
    const key = `${row.family}|${row.model}|${row.compartmentType}`;
    if (!costLookup[key]) costLookup[key] = [];
    costLookup[key].push(row);
  }

  const items: {
    equipment: string;
    family: string;
    model: string;
    tag: string;
    serial: string;
    compartment: string;
    compartmentType: string;
    site: string;
    status: "healthy" | "replacement";
    severity: string;
    cost: number;
    costBreakdown: string;
    evaluation: string;
    recommendation: string;
    sampleCount: number;
  }[] = [];

  for (const [key, rows] of Object.entries(grouped)) {
    const [family, model, compType] = key.split("|");

    // Worst status across samples for this equipment-compartment
    let worstStatus = "Normal";
    let worstEval = "";
    let worstRec = "";
    for (const r of rows) {
      if ((severityRank[r.status] || 0) > (severityRank[worstStatus] || 0)) {
        worstStatus = r.status;
        worstEval = r.evaluation;
        worstRec = r.recommendation;
      }
    }

    // Look up costs from financial file
    const costs = costLookup[key] || [];
    const totalReplacementCost = costs.reduce((sum, c) => sum + c.totalCost, 0);
    const costBreakdown = costs
      .map((c) => `${c.partName}: R$ ${c.totalCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`)
      .join("; ");

    // Determine health: Severe or Abnormal → replacement needed
    const isHealthy = worstStatus === "Normal" || worstStatus === "Caution";

    items.push({
      equipment: `${family} ${model}`,
      family,
      model,
      tag: rows[0]?.tag || "",
      serial: rows[0]?.serial || "",
      compartment: rows[0]?.compartmentName || compType,
      compartmentType: compType,
      site: rows[0]?.site || "",
      status: isHealthy ? "healthy" : "replacement",
      severity: worstStatus,
      cost: isHealthy ? 0 : totalReplacementCost,
      costBreakdown: costBreakdown || "Sin datos financieros",
      evaluation: worstEval,
      recommendation: worstRec || "Sin recomendación específica",
      sampleCount: rows.length,
    });
  }

  return items;
}

export type CrossReferencedItem = ReturnType<typeof crossReference>[number];

export function parseFile(file: File): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "csv") {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => resolve(results.data as Record<string, unknown>[]),
        error: (err) => reject(err),
      });
    } else if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target?.result, { type: "array" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
          resolve(data);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error("Error reading file"));
      reader.readAsArrayBuffer(file);
    } else {
      reject(new Error(`Unsupported file type: ${ext}`));
    }
  });
}
