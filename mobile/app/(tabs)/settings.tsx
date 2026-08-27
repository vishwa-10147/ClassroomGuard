import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert as RNAlert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/stores/AuthContext';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    RNAlert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => { await logout(); router.replace('/(auth)/login'); } },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Settings</Text>

      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={32} color="#3B82F6" />
        </View>
        <View>
          <Text style={styles.name}>{user?.full_name || 'User'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <Text style={styles.role}>{user?.role?.replace('_', ' ')}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <TouchableOpacity style={styles.row}>
          <Ionicons name="person-outline" size={20} color="#94A3B8" />
          <Text style={styles.rowText}>Edit Profile</Text>
          <Ionicons name="chevron-forward" size={18} color="#475569" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.row}>
          <Ionicons name="lock-closed-outline" size={20} color="#94A3B8" />
          <Text style={styles.rowText}>Change Password</Text>
          <Ionicons name="chevron-forward" size={18} color="#475569" />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <TouchableOpacity style={styles.row}>
          <Ionicons name="notifications-outline" size={20} color="#94A3B8" />
          <Text style={styles.rowText}>Push Notifications</Text>
          <Ionicons name="chevron-forward" size={18} color="#475569" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#EF4444" />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>ClassGuard Mobile v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', padding: 16 },
  header: { fontSize: 24, fontWeight: 'bold', color: '#F8FAFC', marginBottom: 20, marginTop: 40 },
  profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 12, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#334155', gap: 14 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#1E3A5F', alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 16, fontWeight: '600', color: '#F8FAFC' },
  email: { fontSize: 13, color: '#94A3B8', marginTop: 2 },
  role: { fontSize: 12, color: '#3B82F6', marginTop: 2, textTransform: 'capitalize' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#64748B', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', borderRadius: 10, padding: 14, marginBottom: 6, borderWidth: 1, borderColor: '#334155', gap: 12 },
  rowText: { flex: 1, fontSize: 15, color: '#F8FAFC' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1E293B', borderRadius: 12, padding: 16, marginTop: 8, borderWidth: 1, borderColor: '#7F1D1D', gap: 8 },
  logoutText: { fontSize: 16, fontWeight: '600', color: '#EF4444' },
  version: { textAlign: 'center', color: '#475569', fontSize: 12, marginTop: 24, marginBottom: 40 },
});
