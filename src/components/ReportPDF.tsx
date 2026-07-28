"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

export interface ReportItem {
  equipment: string;
  tag?: string;
  serial?: string;
  site?: string;
  compartment?: string;
  compartmentType?: string;
  status: "healthy" | "replacement";
  severity: string;
  cost: number;
  costBreakdown?: string;
  evaluation: string;
  recommendation: string;
  sampleCount?: number;
}

interface ReportPDFProps {
  items: ReportItem[];
  generatedAt: string;
  labels: {
    title: string;
    generated: string;
    summary: string;
    equipment: string;
    status: string;
    healthy: string;
    replacement: string;
    cost: string;
    evaluation: string;
    recommendation: string;
    footer: string;
  };
}

const styles = StyleSheet.create({
  page: {
    padding: 35,
    fontSize: 9,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: "#1e40af",
    paddingBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 9,
    color: "#64748b",
  },
  summaryBox: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
    padding: 10,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#334155",
    marginBottom: 6,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  summaryLabel: {
    fontSize: 9,
    color: "#475569",
  },
  summaryValue: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#1e293b",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 8,
    marginTop: 12,
  },
  itemCard: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
    padding: 10,
    marginBottom: 8,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  itemName: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#1e293b",
    flex: 1,
  },
  badgeHealthy: {
    backgroundColor: "#dcfce7",
    color: "#166534",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    fontSize: 8,
    fontWeight: "bold",
  },
  badgeReplacement: {
    backgroundColor: "#fee2e2",
    color: "#dc2626",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    fontSize: 8,
    fontWeight: "bold",
  },
  itemDetail: {
    fontSize: 8,
    color: "#64748b",
    marginBottom: 2,
  },
  itemEval: {
    fontSize: 8,
    color: "#334155",
    marginTop: 4,
    lineHeight: 1.4,
  },
  itemRec: {
    fontSize: 8,
    color: "#1e40af",
    marginTop: 3,
    fontStyle: "italic",
  },
  costRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 0.5,
    borderTopColor: "#e2e8f0",
  },
  costHealthy: {
    fontSize: 9,
    color: "#16a34a",
    fontWeight: "bold",
  },
  costReplacement: {
    fontSize: 9,
    color: "#dc2626",
    fontWeight: "bold",
  },
  footer: {
    position: "absolute",
    bottom: 25,
    left: 35,
    right: 35,
    textAlign: "center",
    fontSize: 7,
    color: "#94a3b8",
    borderTopWidth: 0.5,
    borderTopColor: "#e2e8f0",
    paddingTop: 8,
  },
});

export default function ReportPDF({
  items,
  generatedAt,
  labels,
}: ReportPDFProps) {
  const totalHealthy = items.filter((i) => i.status === "healthy").length;
  const totalReplacement = items.filter((i) => i.status === "replacement").length;
  const totalCost = items.reduce((sum, i) => sum + i.cost, 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{labels.title}</Text>
          <Text style={styles.subtitle}>
            {labels.generated}: {generatedAt}
          </Text>
        </View>

        <View style={styles.summaryBox}>
          <Text style={styles.summaryTitle}>{labels.summary}</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{labels.equipment}:</Text>
            <Text style={styles.summaryValue}>{items.length}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{labels.healthy}:</Text>
            <Text style={[styles.summaryValue, { color: "#16a34a" }]}>
              {totalHealthy}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{labels.replacement}:</Text>
            <Text style={[styles.summaryValue, { color: "#dc2626" }]}>
              {totalReplacement}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total R$:</Text>
            <Text style={[styles.summaryValue, { color: "#dc2626" }]}>
              R$ {totalCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>{labels.equipment}</Text>

        {items.map((item, idx) => (
          <View key={idx} style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemName}>
                {item.equipment} — {item.compartment || item.compartment}
              </Text>
              <Text
                style={
                  item.status === "healthy"
                    ? styles.badgeHealthy
                    : styles.badgeReplacement
                }
              >
                {item.status === "healthy" ? labels.healthy : labels.replacement}
              </Text>
            </View>

            {item.tag && (
              <Text style={styles.itemDetail}>
                Tag: {item.tag} | Serial: {item.serial} | Site: {item.site}
              </Text>
            )}
            <Text style={styles.itemDetail}>
              Severidad: {item.severity} | Muestras: {item.sampleCount || 1}
            </Text>

            {item.evaluation ? (
              <Text style={styles.itemEval}>{item.evaluation}</Text>
            ) : null}

            {item.recommendation ? (
              <Text style={styles.itemRec}>
                {labels.recommendation}: {item.recommendation}
              </Text>
            ) : null}

            <View style={styles.costRow}>
              <Text style={styles.itemDetail}>{labels.cost}</Text>
              <Text
                style={
                  item.status === "healthy" ? styles.costHealthy : styles.costReplacement
                }
              >
                R${" "}
                {item.cost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </Text>
            </View>

            {item.costBreakdown && item.costBreakdown !== "Sin datos financieros" && (
              <Text style={[styles.itemDetail, { marginTop: 2, fontSize: 7 }]}>
                {item.costBreakdown}
              </Text>
            )}
          </View>
        ))}

        <Text style={styles.footer}>{labels.footer}</Text>
      </Page>
    </Document>
  );
}
