import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Image, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cameraService, Camera } from '../../src/api/data';

const API_BASE = 'http://192.168.1.100:8000/api/v1';

export default function CamerasScreen() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [gridMode, setGridMode] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [snapshotTick, setSnapshotTick] = useState(0);

  const load = async () => {
    try {
      const data = await cameraService.getAll();
      setCameras(data);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!gridMode) return;
    const interval = setInterval(() => setSnapshotTick((t) => t + 1), 5000);
    return () => clearInterval(interval);
  }, [gridMode]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const snapshotUrl = useCallback(
    (camId: string) => `${API_BASE}/cameras/${camId}/snapshot?t=${snapshotTick}`,
    [snapshotTick],
  );

  if (gridMode) {
    return (
      <View style={styles.container}>
        <View style={styles.toolbar}>
          <Text style={styles.header}>Cameras</Text>
          <TouchableOpacity onPress={() => setGridMode(false)} style={styles.toggleBtn}>
            <Ionicons name="list" size={20} color="#3B82F6" />
            <Text style={styles.toggleLabel}>List</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.grid}>
          {cameras.map((cam) => (
            <TouchableOpacity key={cam.id} style={styles.gridCell} onPress={() => setSelectedCamera(cam)} activeOpacity={0.8}>
              <Image source={{ uri: snapshotUrl(cam.id) }} style={styles.gridImage} resizeMode="cover" />
              <View style={styles.gridOverlay}>
                <Text style={styles.gridName} numberOfLines={1}>{cam.name}</Text>
                <View style={[styles.dot, { backgroundColor: cam.is_active ? '#10B981' : '#EF4444' }]} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <Modal visible={!!selectedCamera} transparent animationType="fade" onRequestClose={() => setSelectedCamera(null)}>
          <Pressable style={styles.modalBg} onPress={() => setSelectedCamera(null)}>
            <View style={styles.modalContent}>
              {selectedCamera && (
                <>
                  <Image source={{ uri: snapshotUrl(selectedCamera.id) }} style={styles.fullImage} resizeMode="contain" />
                  <Text style={styles.fullName}>{selectedCamera.name}</Text>
                </>
              )}
            </View>
          </Pressable>
        </Modal>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />}>
      <View style={styles.toolbar}>
        <Text style={styles.header}>Cameras</Text>
        <TouchableOpacity onPress={() => setGridMode(true)} style={styles.toggleBtn}>
          <Ionicons name="grid" size={20} color="#3B82F6" />
          <Text style={styles.toggleLabel}>Grid</Text>
        </TouchableOpacity>
      </View>

      {cameras.length === 0 ? (
        <Text style={styles.empty}>No cameras configured</Text>
      ) : (
        cameras.map((cam) => (
          <View key={cam.id} style={styles.card}>
            <Image source={{ uri: snapshotUrl(cam.id) }} style={styles.snapshot} resizeMode="cover" />
            <View style={styles.info}>
              <Text style={styles.name}>{cam.name}</Text>
              <Text style={styles.rtsp} numberOfLines={1}>{cam.rtsp_url}</Text>
              <View style={styles.statusRow}>
                <View style={[styles.dot, { backgroundColor: cam.is_active ? '#10B981' : '#EF4444' }]} />
                <Text style={[styles.status, { color: cam.is_active ? '#10B981' : '#EF4444' }]}>
                  {cam.is_active ? 'Online' : 'Offline'}
                </Text>
              </View>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', padding: 16 },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 40, marginBottom: 20 },
  header: { fontSize: 24, fontWeight: 'bold', color: '#F8FAFC' },
  toggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1E293B', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#334155' },
  toggleLabel: { fontSize: 13, color: '#3B82F6', fontWeight: '500' },
  empty: { color: '#64748B', textAlign: 'center', padding: 48 },
  card: { backgroundColor: '#1E293B', borderRadius: 12, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  snapshot: { width: '100%', height: 180, backgroundColor: '#0F172A' },
  info: { padding: 14 },
  name: { fontSize: 16, fontWeight: '600', color: '#F8FAFC' },
  rtsp: { fontSize: 11, color: '#64748B', marginTop: 4 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  status: { fontSize: 12, fontWeight: '500' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gridCell: { width: '48%', aspectRatio: 1.3, borderRadius: 10, overflow: 'hidden', marginBottom: 8, backgroundColor: '#1E293B' },
  gridImage: { width: '100%', height: '100%' },
  gridOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(15,23,42,0.8)', paddingHorizontal: 8, paddingVertical: 6 },
  gridName: { fontSize: 12, fontWeight: '600', color: '#F8FAFC', flex: 1 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', alignItems: 'center' },
  fullImage: { width: '100%', height: 400, borderRadius: 12, backgroundColor: '#1E293B' },
  fullName: { fontSize: 16, fontWeight: '600', color: '#F8FAFC', marginTop: 12 },
});
