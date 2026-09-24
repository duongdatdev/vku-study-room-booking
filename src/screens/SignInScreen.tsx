import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../types';
import { useAuth } from '../providers/AuthProvider';

type Props = NativeStackScreenProps<RootStackParamList, 'SignIn'>;

export const SignInScreen: React.FC<Props> = ({ navigation }) => {
  const { session, configured, sendEmailOtp, verifyEmailOtp } = useAuth();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session) navigation.goBack();
  }, [navigation, session]);

  const handleSendCode = async () => {
    setBusy(true);
    setError(null);
    try {
      await sendEmailOtp(email);
      setEmail(email.trim().toLowerCase());
      setCodeSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the sign-in code.');
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyCode = async () => {
    setBusy(true);
    setError(null);
    try {
      await verifyEmailOtp(email, code);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not verify the sign-in code.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backButton}>
            <Ionicons name="arrow-back" size={20} color="#1E3A5F" />
          </Pressable>
          <Text style={styles.headerTitle}>VKU account</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.content}>
          <View style={styles.iconWrap}>
            <Ionicons name="mail-unread-outline" size={28} color="#1E3A5F" />
          </View>
          <Text style={styles.title}>{codeSent ? 'Enter your code' : 'Sign in to book'}</Text>
          <Text style={styles.subtitle}>
            {codeSent
              ? `We sent a 6-digit code to ${email}.`
              : 'Use your VKU email address. We will email you a one-time sign-in code.'}
          </Text>

          {!configured ? (
            <View style={styles.setupNotice}>
              <Ionicons name="cloud-offline-outline" size={20} color="#92400E" />
              <Text style={styles.setupText}>
                Supabase is not configured. Add the project URL and publishable key from .env.example, then restart Expo.
              </Text>
            </View>
          ) : codeSent ? (
            <>
              <Text style={styles.fieldLabel}>6-digit code</Text>
              <TextInput
                value={code}
                onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
                style={styles.input}
                placeholder="123456"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                maxLength={6}
                autoFocus
                editable={!busy}
                accessibilityLabel="Six digit email code"
              />
              <Pressable disabled={busy} onPress={() => { setCodeSent(false); setCode(''); setError(null); }}>
                <Text style={styles.secondaryAction}>Use a different email</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.fieldLabel}>VKU email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                placeholder="name@vku.udn.vn"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="emailAddress"
                editable={!busy}
                accessibilityLabel="VKU email address"
              />
            </>
          )}

          {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}

          {configured && (
            <Pressable
              accessibilityRole="button"
              disabled={busy || (codeSent && code.length !== 6)}
              onPress={codeSent ? handleVerifyCode : handleSendCode}
              style={({ pressed }) => [
                styles.primaryButton,
                (busy || (codeSent && code.length !== 6)) && styles.primaryButtonDisabled,
                pressed && !busy && styles.primaryButtonPressed,
              ]}
            >
              {busy ? <ActivityIndicator color="#FFFFFF" /> : (
                <Text style={styles.primaryButtonText}>{codeSent ? 'Verify and continue' : 'Email me a code'}</Text>
              )}
            </Pressable>
          )}

          {codeSent && configured && (
            <Pressable disabled={busy} onPress={handleSendCode} style={styles.resendButton}>
              <Text style={styles.secondaryAction}>Send a new code</Text>
            </Pressable>
          )}
          <Text style={styles.privacyNote}>Only an email ending in @vku.udn.vn can reserve a room.</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    minHeight: 54,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: { width: 36, height: 36, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { color: '#0F172A', fontSize: 16, fontWeight: '700' },
  headerSpacer: { width: 36 },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 52 },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 22,
  },
  title: { color: '#0F172A', fontSize: 25, fontWeight: '800', letterSpacing: -0.4 },
  subtitle: { color: '#64748B', fontSize: 14, lineHeight: 21, marginTop: 8, marginBottom: 28 },
  fieldLabel: { color: '#334155', fontSize: 12, fontWeight: '700', marginBottom: 8 },
  input: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    color: '#0F172A',
    fontSize: 16,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: '#1E3A5F',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
  },
  primaryButtonDisabled: { opacity: 0.45 },
  primaryButtonPressed: { opacity: 0.85 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  secondaryAction: { color: '#1D4ED8', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  resendButton: { paddingVertical: 14 },
  error: { color: '#B91C1C', fontSize: 13, marginTop: 12 },
  setupNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FEF3C7',
    padding: 14,
    borderRadius: 12,
  },
  setupText: { flex: 1, color: '#78350F', fontSize: 13, lineHeight: 19 },
  privacyNote: { color: '#64748B', fontSize: 12, lineHeight: 17, textAlign: 'center', marginTop: 24 },
});
