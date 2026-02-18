import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { auth, db } from '../config/firebase';
import { doc, setDoc } from 'firebase/firestore';
import QRCode from 'react-native-qrcode-svg';
import { useAppStore } from '../store/appStore';
import { useTheme } from '../contexts/ThemeContext';

export default function PaymentDetailsScreen() {
    const router = useRouter();
    const { userProfile } = useAppStore();
    const { isDark, colors } = useTheme();
    const [loading, setLoading] = useState(false);

    // Form State — pre-filled from Zustand store (already synced from Firestore)
    const [businessName, setBusinessName] = useState('');
    const [upiId, setUpiId] = useState('');
    const [bankName, setBankName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [ifscCode, setIfscCode] = useState('');
    const [panNumber, setPanNumber] = useState('');
    const [gstNumber, setGstNumber] = useState('');

    // Pre-fill from live userProfile in store
    useEffect(() => {
        if (userProfile) {
            setBusinessName(userProfile.businessName || '');
            setUpiId(userProfile.upiId || '');
            setBankName(userProfile.bankName || '');
            setAccountNumber(userProfile.accountNumber || '');
            setIfscCode(userProfile.ifscCode || '');
            setPanNumber(userProfile.panNumber || '');
            setGstNumber(userProfile.gstNumber || '');
        }
    }, [userProfile]);

    const handleSave = async () => {
        setLoading(true);
        try {
            const currentUser = auth.currentUser;
            if (currentUser) {
                await setDoc(doc(db, 'users', currentUser.uid), {
                    businessName,
                    upiId,
                    bankName,
                    accountNumber,
                    ifscCode,
                    panNumber,
                    gstNumber,
                    updatedAt: new Date().toISOString()
                }, { merge: true });

                Alert.alert('✅ Saved', 'Payment details updated successfully!');
            }
        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Failed to save. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const upiUrl = upiId ? `upi://pay?pa=${upiId}&pn=${encodeURIComponent(businessName)}&cu=INR` : '';

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={isDark ? 'light' : 'dark'} />

            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={[styles.backBtn, { backgroundColor: colors.inputBg }]}
                >
                    <Feather name="arrow-left" size={22} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Payment Details</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* UPI QR Code Card */}
                {upiId ? (
                    <View style={[styles.qrCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={[styles.qrContainer, { borderColor: colors.primary }]}>
                            <QRCode
                                value={upiUrl}
                                size={140}
                                backgroundColor={isDark ? colors.card : '#FFFFFF'}
                                color={isDark ? colors.text : '#000000'}
                            />
                        </View>
                        <Text style={[styles.qrLabel, { color: colors.textSecondary }]}>Scan to Pay</Text>
                        <Text style={[styles.qrUpi, { color: colors.text }]}>{upiId}</Text>
                    </View>
                ) : (
                    <View style={[styles.qrPlaceholder, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={[styles.qrPlaceholderIcon, { backgroundColor: colors.inputBg }]}>
                            <Feather name="at-sign" size={32} color={colors.textSecondary} />
                        </View>
                        <Text style={[styles.qrPlaceholderText, { color: colors.textSecondary }]}>
                            Enter your UPI ID below to generate a payment QR code
                        </Text>
                    </View>
                )}

                {/* UPI Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>UPI Details</Text>
                    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>BUSINESS NAME</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                                <Feather name="briefcase" size={18} color={colors.textSecondary} />
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    placeholder="Your Business Name"
                                    placeholderTextColor={colors.textSecondary}
                                    value={businessName}
                                    onChangeText={setBusinessName}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>UPI ID</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                                <Feather name="at-sign" size={18} color={colors.textSecondary} />
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    placeholder="yourname@upi"
                                    placeholderTextColor={colors.textSecondary}
                                    value={upiId}
                                    onChangeText={setUpiId}
                                    autoCapitalize="none"
                                />
                            </View>
                        </View>
                    </View>
                </View>

                {/* Bank Details Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Bank Details (Optional)</Text>
                    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>BANK NAME</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                                <Feather name="home" size={18} color={colors.textSecondary} />
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    placeholder="HDFC Bank"
                                    placeholderTextColor={colors.textSecondary}
                                    value={bankName}
                                    onChangeText={setBankName}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>ACCOUNT NUMBER</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                                <Feather name="hash" size={18} color={colors.textSecondary} />
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    placeholder="1234567890"
                                    placeholderTextColor={colors.textSecondary}
                                    value={accountNumber}
                                    onChangeText={setAccountNumber}
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>IFSC CODE</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                                <Feather name="code" size={18} color={colors.textSecondary} />
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    placeholder="HDFC0001234"
                                    placeholderTextColor={colors.textSecondary}
                                    value={ifscCode}
                                    onChangeText={setIfscCode}
                                    autoCapitalize="characters"
                                />
                            </View>
                        </View>
                    </View>
                </View>

                {/* Tax Details Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Tax Details (Optional)</Text>
                    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>PAN NUMBER</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                                <Feather name="credit-card" size={18} color={colors.textSecondary} />
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    placeholder="ABCDE1234F"
                                    placeholderTextColor={colors.textSecondary}
                                    value={panNumber}
                                    onChangeText={setPanNumber}
                                    autoCapitalize="characters"
                                    maxLength={10}
                                />
                            </View>
                        </View>

                        <View style={[styles.inputGroup, { marginBottom: 0 }]}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>GSTIN</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                                <Feather name="file-text" size={18} color={colors.textSecondary} />
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    placeholder="22AAAAA0000A1Z5"
                                    placeholderTextColor={colors.textSecondary}
                                    value={gstNumber}
                                    onChangeText={setGstNumber}
                                    autoCapitalize="characters"
                                    maxLength={15}
                                />
                            </View>
                        </View>
                    </View>
                </View>

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* Save Button */}
            <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
                <TouchableOpacity
                    style={[styles.saveBtn, { backgroundColor: colors.primary }, loading && styles.saveBtnDisabled]}
                    onPress={handleSave}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <>
                            <Feather name="check" size={20} color="#FFF" />
                            <Text style={styles.saveBtnText}>Save Details</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 60,
        paddingHorizontal: 24,
        paddingBottom: 20,
        borderBottomWidth: 1,
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    content: {
        padding: 24,
    },
    qrCard: {
        borderRadius: 24,
        padding: 28,
        alignItems: 'center',
        marginBottom: 24,
        borderWidth: 1,
    },
    qrContainer: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 2,
    },
    qrLabel: {
        marginTop: 16,
        fontSize: 14,
    },
    qrUpi: {
        marginTop: 4,
        fontSize: 16,
        fontWeight: '600',
    },
    qrPlaceholder: {
        borderRadius: 24,
        padding: 28,
        alignItems: 'center',
        marginBottom: 24,
        borderWidth: 1,
        borderStyle: 'dashed',
    },
    qrPlaceholderIcon: {
        width: 72,
        height: 72,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    qrPlaceholderText: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 10,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    card: {
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 11,
        marginBottom: 8,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        paddingHorizontal: 14,
        borderWidth: 1,
        gap: 10,
    },
    input: {
        flex: 1,
        paddingVertical: 14,
        fontSize: 15,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopWidth: 1,
        padding: 24,
        paddingBottom: 40,
    },
    saveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 14,
        gap: 8,
    },
    saveBtnDisabled: {
        opacity: 0.6,
    },
    saveBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});
