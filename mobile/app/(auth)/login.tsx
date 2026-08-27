import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/stores/AuthContext';

const DEMO_ACCOUNTS = [
  { label: 'Super Admin', email: 'admin@classguard.dev', password: 'Admin@12345' },
  { label: 'Faculty', email: 'faculty@classguard.dev', password: 'Faculty@12345' },
  { label: 'Security', email: 'security@classguard.dev', password: 'Security@12345' },
];

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert('Error', 'Enter email and password');
    setLoading(true);
    try {
      await login(email, password);
      router.replace('/(tabs)/dashboard');
    } catch (e: any) {
      Alert.alert('Login Failed', e.response?.data?.detail || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.inner}>
        <Text style={styles.title}>ClassGuard</Text>
        <Text style={styles.subtitle}>AI Cheating Detection</Text>

        <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#64748B" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#64748B" value={password} onChangeText={setPassword} secureTextEntry />

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Sign In</Text>}
        </TouchableOpacity>

        <Text style={styles.demoLabel}>Quick Login:</Text>
        <View style={styles.demoRow}>
          {DEMO_ACCOUNTS.map((a) => (
            <TouchableOpacity key={a.email} style={styles.demoBtn} onPress={() => { setEmail(a.email); setPassword(a.password); }}>
              <Text style={styles.demoBtnText}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  inner: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 36, fontWeight: 'bold', color: '#3B82F6', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#94A3B8', textAlign: 'center', marginBottom: 40 },
  input: { backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155', borderRadius: 12, padding: 16, fontSize: 16, color: '#F8FAFC', marginBottom: 16 },
  button: { backgroundColor: '#3B82F6', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 24 },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  demoLabel: { color: '#64748B', textAlign: 'center', marginBottom: 8, fontSize: 12 },
  demoRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  demoBtn: { backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  demoBtnText: { color: '#94A3B8', fontSize: 11 },
});
