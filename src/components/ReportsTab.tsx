import { useState, useCallback, useEffect } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { getReport, getExportDownloadConfig } from '../../services/reportService';
import { showAlert } from '../../services/alertService';
import { useAppTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

const REPORT_TYPES = [
  { key: 'summary', label: 'Full Summary' },
  { key: 'contributions', label: 'Contributions' },
  { key: 'loans', label: 'Loans' },
  { key: 'payouts', label: 'Payouts' },
  { key: 'savings_target', label: 'Savings Target' },
];
function exportFileName(groupName: string, type: string, format: string) {
  const slug =
    groupName
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'chama';
  const d = new Date();
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return `${slug}_${type.replace(/_/g, '-')}_${date}.${format}`;
}

// "loan_disbursement" -> "Loan disbursement"; money columns get thousands separators
function formatCell(cell: any, column: string) {
  if (cell === null || cell === undefined || cell === '') return '-';
  if (typeof cell === 'string' && /^[a-z]+(_[a-z]+)*$/.test(cell)) {
    const text = cell.replace(/_/g, ' ');
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
  if (/amount|total|paid|balance|outstanding|principal|interest|remaining|shortfall/i.test(column) && !isNaN(Number(cell))) {
    return Number(cell).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return String(cell);
}

export default function ReportsTab({ groupId, groupName }: { groupId: string; groupName: string }) {
  const { colors } = useAppTheme();
  const [selectedType, setSelectedType] = useState('summary');
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const loadReport = useCallback(async (type: string) => {
    setLoading(true);
    try {
      const data = await getReport(groupId, type);
      setReport(data);
    } catch (err: any) {
      console.log('Error loading report:', err.message);
      showAlert('Error', 'Could not load this report. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

const handleSelectType = (type: string) => {
    setSelectedType(type);
    loadReport(type);
  };

const handleExport = async (format: 'csv' | 'pdf') => {
    setExporting(true);
    try {
      const { url, headers } = await getExportDownloadConfig(groupId, selectedType, format);
      const fileUri = `${FileSystem.cacheDirectory}${exportFileName(groupName, selectedType, format)}`;

      const result = await FileSystem.downloadAsync(url, fileUri, { headers: { ...headers } });


      if (result.status !== 200) {
        throw new Error(`Server responded with status ${result.status}`);
      }

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(result.uri);
      } else {
        showAlert('Downloaded', `Saved to ${result.uri}`);
      }
    } catch (err: any) {
      console.log('Error exporting report:', err.message);
      showAlert('Export Failed', 'Could not export this report. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // Load the default report on first mount
  useEffect(() => {
    loadReport(selectedType);
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeRow}>
        {REPORT_TYPES.map((rt) => (
            <TouchableOpacity
            key={rt.key}
            onPress={() => handleSelectType(rt.key)}
            activeOpacity={0.8}
            style={[
              styles.typeChip,
              { backgroundColor: selectedType === rt.key ? colors.primary + '26' : colors.surface }
            ]}
          >
            <Text style={[styles.typeChipText, { color: selectedType === rt.key ? colors.primary : colors.textSecondary }]}>
              {rt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={colors.primary} />
      ) : report ? (
        <>
          <Text style={[styles.reportTitle, { color: colors.text }]}>{report.title}</Text>

          <View style={styles.exportRow}>
              {(['csv', 'pdf'] as const).map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.exportButton, { backgroundColor: colors.primary + '1a', opacity: exporting ? 0.6 : 1 }]}
                onPress={() => handleExport(f)}
                disabled={exporting}
                activeOpacity={0.8}
              >
                <Ionicons name="download-outline" size={16} color={colors.primary} />
                <Text style={[styles.exportButtonText, { color: colors.primary }]}>Export {f.toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View>
              <View style={[styles.tableRow, styles.tableHeaderRow, { borderColor: colors.border }]}>
                {report.columns.map((col: string, i: number) => (
                  <Text key={i} style={[styles.tableCell, styles.tableHeaderCell, { color: colors.text }]}>
                    {col}
                  </Text>
                ))}
              </View>
              {report.rows.length === 0 ? (
                <Text style={[styles.empty, { color: colors.textMuted }]}>No data for this report.</Text>
              ) : (
                report.rows.map((row: any[], rIdx: number) => (
                  <View key={rIdx} style={[styles.tableRow, { borderColor: colors.border }]}>
                    {row.map((cell, cIdx) => (
                      <Text key={cIdx} style={[styles.tableCell, { color: colors.textSecondary }]}>
 {formatCell(cell, report.columns[cIdx])}
</Text>
                    ))}
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 12 },
  typeRow: { flexGrow: 0, marginBottom: 16 },
  typeChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, marginRight: 8 },
  typeChipText: { fontSize: 12, fontWeight: '700' },
  reportTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  exportRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  exportButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12 },
  exportButtonText: { fontSize: 13, fontWeight: '600' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, paddingVertical: 10 },
  tableHeaderRow: { borderBottomWidth: 2 },
  tableCell: { width: 130, fontSize: 13, paddingHorizontal: 8 },
  tableHeaderCell: { fontWeight: '700', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  empty: { textAlign: 'center', marginTop: 20, paddingHorizontal: 8 }
});