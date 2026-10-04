import { useState, useCallback, useEffect } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { getReport, getExportDownloadConfig } from '../../services/reportService';
import { showAlert } from '../../services/alertService';
import { useAppTheme } from '../../context/ThemeContext';

const REPORT_TYPES = [
  { key: 'summary', label: 'Full Summary' },
  { key: 'contributions', label: 'Contributions' },
  { key: 'loans', label: 'Loans' },
  { key: 'payouts', label: 'Payouts' },
  { key: 'savings_target', label: 'Savings Target' },
];

export default function ReportsTab({ groupId }: { groupId: string }) {
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
const fileUri = `${FileSystem.cacheDirectory}${selectedType}-report.${format}`;

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
            style={[
              styles.typeChip,
              { borderColor: colors.primary },
              selectedType === rt.key && { backgroundColor: colors.primary }
            ]}
          >
            <Text style={[
              styles.typeChipText,
              { color: selectedType === rt.key ? colors.background : colors.primary }
            ]}>
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
            <TouchableOpacity
              style={[styles.exportButton, { borderColor: colors.primary }]}
              onPress={() => handleExport('csv')}
              disabled={exporting}
            >
              <Text style={[styles.exportButtonText, { color: colors.primary }]}>Export CSV</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.exportButton, { borderColor: colors.primary }]}
              onPress={() => handleExport('pdf')}
              disabled={exporting}
            >
              <Text style={[styles.exportButtonText, { color: colors.primary }]}>Export PDF</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View>
              <View style={[styles.tableRow, styles.tableHeaderRow, { borderColor: colors.surfaceAlt }]}>
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
                  <View key={rIdx} style={[styles.tableRow, { borderColor: colors.surfaceAlt }]}>
                    {row.map((cell, cIdx) => (
                      <Text key={cIdx} style={[styles.tableCell, { color: colors.textSecondary }]}>
                        {String(cell ?? '-')}
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
  typeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  typeChipText: { fontSize: 13, fontWeight: '600' },
  reportTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  exportRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  exportButton: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  exportButtonText: { fontSize: 13, fontWeight: '600' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, paddingVertical: 10 },
  tableHeaderRow: { borderBottomWidth: 2 },
  tableCell: { width: 120, fontSize: 13, paddingHorizontal: 8 },
  tableHeaderCell: { fontWeight: '700' },
  empty: { textAlign: 'center', marginTop: 20, paddingHorizontal: 8 }
});