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
  status: "healthy" | "replacement";
  cost: number;
  recommendation: string;
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
    recommendation: string;
    footer: string;
  };
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
  },
  header: {
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: "#1e40af",
    paddingBottom: 15,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: "#64748b",
  },
  summaryBox: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 6,
    padding: 14,
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#334155",
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 10,
    color: "#475569",
  },
  summaryValue: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#1e293b",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#1e293b",
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 4,
  },
  th: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#ffffff",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 7,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  td: {
    fontSize: 9,
    color: "#334155",
  },
  statusBadgeHealthy: {
    backgroundColor: "#dcfce7",
    color: "#166534",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    fontSize: 8,
    fontWeight: "bold",
    textAlign: "center",
  },
  statusBadgeReplacement: {
    backgroundColor: "#fee2e2",
    color: "#dc2626",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    fontSize: 8,
    fontWeight: "bold",
    textAlign: "center",
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
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: "#94a3b8",
    borderTopWidth: 0.5,
    borderTopColor: "#e2e8f0",
    paddingTop: 10,
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

        <View style={styles.tableHeader}>
          <Text style={[styles.th, { flex: 2 }]}>{labels.equipment}</Text>
          <Text style={[styles.th, { flex: 1.5 }]}>{labels.status}</Text>
          <Text style={[styles.th, { flex: 1, textAlign: "right" }]}>{labels.cost}</Text>
        </View>

        {items.map((item, idx) => (
          <View key={idx} style={styles.tableRow}>
            <Text style={[styles.td, { flex: 2 }]}>{item.equipment}</Text>
            <View style={{ flex: 1.5 }}>
              <Text
                style={
                  item.status === "healthy"
                    ? styles.statusBadgeHealthy
                    : styles.statusBadgeReplacement
                }
              >
                {item.status === "healthy" ? labels.healthy : labels.replacement}
              </Text>
            </View>
            <Text
              style={[
                item.status === "healthy" ? styles.costHealthy : styles.costReplacement,
                { flex: 1, textAlign: "right" },
              ]}
            >
              R${" "}
              {item.cost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </Text>
          </View>
        ))}

        <Text style={styles.footer}>{labels.footer}</Text>
      </Page>
    </Document>
  );
}
