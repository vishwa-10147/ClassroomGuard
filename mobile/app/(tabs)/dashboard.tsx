import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { dashboardService, DashboardStats, alertService, Alert } from '../../src/api/data';
import { useWebSocket } from '../../src/hooks/useWebSocket';

export default function DashboardScreen() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const { connected, lastMessage } = useWebSocket();

  const load = async () => {
    try {
      const [s, a] = await Promise.all([dashboardService.getStats(), alertService.getActive()]);
      setStats(s);
      setAlerts(a);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (lastMessage?.type === 'alert' && lastMessage.payload) {
      const payload = lastMessage.payload as Record<string, unknown>;
      const wsAlert: Alert = {
        id: payload.id as string,
        alert_type: (payload.title as string) || 'Alert',
        severity: (payload.severity as string) || 'low',
        description: (payload.description as string) || '',
        camera_id: (payload.camera_id as string) || '',
        classroom_id: (payload.classroom_id as string) || '',
        created_at: (payload.created_at as string) || new Date().toISOString(),
        is_resolved: false,
      };
      setAlerts((prev) => {
        if (prev.some((a) => a.id === wsAlert.id)) return prev;
        return [wsAlert, ...prev].slice(0, 50);
      });
    }
  }, [lastMessage]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const statCards = useMemo(() => stats ? [
    { icon: 'videocam', label: 'Active Cameras', value: stats.active_cameras, color: '#3B82F6' },
    { icon: 'alert-circle', label: 'Active Alerts', value: stats.active_alerts, color: '#EF4444' },
    { icon: 'school', label: 'Classrooms', value: stats.total_classrooms, color: '#10B981' },
    { icon: 'people', label: 'Users', value: stats.total_users, color: '#8B5CF6' },
  ] : [], [stats]);

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Dashboard</Text>
        <View style={styles.wsIndicator}>
          <View style={[styles.wsDot, { backgroundColor: connected ? '#10B981' : '#EF4444' }]} />
          <Text style={styles.wsLabel}>{connected ? 'Live' : 'Offline'}</Text>
        </View>
      </View>

      <View style={styles.grid}>
        {statCards.map((s) => (
          <View key={s.label} style={styles.card}>
            <Ionicons name={s.icon as any} size={28} color={s.color} />
            <Text style={styles.cardValue}>{s.value ?? '--'}</Text>
            <Text style={styles.cardLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Recent Alerts</Text>
      {alerts.length === 0 ? (
        <Text style={styles.empty}>No active alerts</Text>
      ) : (
        alerts.slice(0, 10).map((a) => (
          <View key={a.id} style={styles.alertRow}>
            <View style={[styles.severityDot, { backgroundColor: a.severity === 'high' ? '#EF4444' : a.severity === 'medium' ? '#F59E0B' : '#3B82F6' }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.alertType}>{a.alert_type}</Text>
              <Text style={styles.alertDesc} numberOfLines={1}>{a.description}</Text>
            </View>
            <Text style={styles.alertTime}>{new Date(a.created_at).toLocaleTimeString()}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 40, marginBottom: 20 },
  header: { fontSize: 24, fontWeight: 'bold', color: '#F8FAFC' },
  wsIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  wsDot: { width: 8, height: 8, borderRadius: 4 },
  wsLabel: { fontSize: 12, color: '#94A3B8' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  card: { width: '47%', backgroundColor: '#1E293B', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#334155' },
  cardValue: { fontSize: 28, fontWeight: 'bold', color: '#F8FAFC', marginTop: 8 },
  cardLabel: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#F8FAFC', marginBottom: 12 },
  empty: { color: '#64748B', textAlign: 'center', padding: 24 },
  alertRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 8, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#334155' },
  severityDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  alertType: { fontSize: 14, fontWeight: '600', color: '#F8FAFC' },
  alertDesc: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  alertTime: { fontSize: 11, color: '#64748B' },
});
