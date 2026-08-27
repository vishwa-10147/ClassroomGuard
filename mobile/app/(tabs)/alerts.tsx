import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { alertService, Alert } from '../../src/api/data';

const SEVERITY_COLORS: Record<string, string> = { high: '#EF4444', medium: '#F59E0B', low: '#3B82F6' };

export default function AlertsScreen() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const data = await alertService.getAll({ limit: 50 });
      setAlerts(data);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Alerts</Text>
      <FlatList
        data={alerts}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={<Text style={styles.empty}>No alerts</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={[styles.sevBar, { backgroundColor: SEVERITY_COLORS[item.severity] || '#3B82F6' }]} />
            <View style={styles.content}>
              <View style={styles.topRow}>
                <Text style={styles.type}>{item.alert_type}</Text>
                <Text style={[styles.severity, { color: SEVERITY_COLORS[item.severity] }]}>{item.severity}</Text>
              </View>
              <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
              <Text style={styles.time}>{new Date(item.created_at).toLocaleString()}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', padding: 16 },
  header: { fontSize: 24, fontWeight: 'bold', color: '#F8FAFC', marginBottom: 16, marginTop: 40 },
  empty: { color: '#64748B', textAlign: 'center', padding: 48 },
  row: { flexDirection: 'row', backgroundColor: '#1E293B', borderRadius: 10, marginBottom: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#334155' },
  sevBar: { width: 4 },
  content: { flex: 1, padding: 14 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  type: { fontSize: 14, fontWeight: '600', color: '#F8FAFC' },
  severity: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  desc: { fontSize: 13, color: '#94A3B8', marginTop: 4 },
  time: { fontSize: 11, color: '#64748B', marginTop: 6 },
});
