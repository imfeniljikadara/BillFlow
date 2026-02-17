import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { auth, db } from '../config/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import QRCode from 'react-native-qrcode-svg';

export default function PaymentDetailsScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // Form State
    const [businessName, setBusinessName] = useState('');
    const [upiId, setUpiId] = useState('');
    const [bankName, setBankName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [ifscCode, setIfscCode] = useState('');
    const [panNumber, setPanNumber] = useState('');
    const [gstNumber, setGstNumber] = useState('');

    useEffect(() => {
        loadUserData();
    }, []);

    const loadUserData = async () => {
        try {
            const currentUser = auth.currentUser;
            if (currentUser) {
                const docRef = doc(db, 'users', currentUser.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setBusinessName(data.businessName || '');
                    setUpiId(data.upiId || '');
                    setBankName(data.bankName || '');
                    setAccountNumber(data.accountNumber || '');
                    setIfscCode(data.ifscCode || '');
                    setPanNumber(data.panNumber || '');
                    setGstNumber(data.gstNumber || '');
                }
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleSave = async () => {
        if (!upiId) {
            Alert.alert('Required', 'Please enter UPI ID');
            return;
        }

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

                Alert.alert('Saved', 'Payment details updated successfully!');
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
        <View style={styles.container}>
            <StatusBar style="dark" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Feather name="arrow-left" size={22} color="#1E1E1E" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Payment Details</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* UPI QR Code Card */}
                {upiId && (
                    <View style={styles.qrCard}>
                        <View style={styles.qrContainer}>
                            <QRCode
                                value={upiUrl}
                                size={140}
                                backgroundColor="#FFFFFF"
                            />
                        </View>
                        <Text style={styles.qrLabel}>Scan to Pay</Text>
                        <Text style={styles.qrUpi}>{upiId}</Text>
                    </View>
                )}

                {/* UPI Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>UPI Details</Text>
                    <View style={styles.card}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>UPI ID</Text>
                            <View style={styles.inputWrapper}>
                                <Feather name="at-sign" size={18} color="#9CA3AF" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="yourname@upi"
                                    placeholderTextColor="#9CA3AF"
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
                    <Text style={styles.sectionTitle}>Bank Details (Optional)</Text>
                    <View style={styles.card}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>BANK NAME</Text>
                            <View style={styles.inputWrapper}>
                                <Feather name="home" size={18} color="#9CA3AF" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="HDFC Bank"
                                    placeholderTextColor="#9CA3AF"
                                    value={bankName}
                                    onChangeText={setBankName}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>ACCOUNT NUMBER</Text>
                            <View style={styles.inputWrapper}>
                                <Feather name="hash" size={18} color="#9CA3AF" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="1234567890"
                                    placeholderTextColor="#9CA3AF"
                                    value={accountNumber}
                                    onChangeText={setAccountNumber}
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>IFSC CODE</Text>
                            <View style={styles.inputWrapper}>
                                <Feather name="code" size={18} color="#9CA3AF" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="HDFC0001234"
                                    placeholderTextColor="#9CA3AF"
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
                    <Text style={styles.sectionTitle}>Tax Details (Optional)</Text>
                    <View style={styles.card}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>PAN NUMBER</Text>
                            <View style={styles.inputWrapper}>
                                <Feather name="credit-card" size={18} color="#9CA3AF" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="ABCDE1234F"
                                    placeholderTextColor="#9CA3AF"
                                    value={panNumber}
                                    onChangeText={setPanNumber}
                                    autoCapitalize="characters"
                                    maxLength={10}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>GSTIN</Text>
                            <View style={styles.inputWrapper}>
                                <Feather name="file-text" size={18} color="#9CA3AF" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="22AAAAA0000A1Z5"
                                    placeholderTextColor="#9CA3AF"
                                    value={gstNumber}
                                    onChangeText={setGstNumber}
                                    autoCapitalize="characters"
                                    maxLength={15}
                                />
                            </View>
                        </View>
                    </View>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Save Button */}
            <View style={styles.footer}>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
                    <Text style={styles.saveBtnText}>{loading ? 'Saving...' : 'Save Details'}</Text>
                    <Feather name="check" size={20} color="#FFF" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 60,
        paddingHorizontal: 24,
        paddingBottom: 20,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#F9FAFB',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        color: '#1E1E1E',
        fontWeight: '600',
    },
    content: {
        padding: 24,
    },
    qrCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 28,
        alignItems: 'center',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    qrContainer: {
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#2563EB',
    },
    qrLabel: {
        marginTop: 16,
        fontSize: 14,
        color: '#6B7280',
    },
    qrUpi: {
        marginTop: 4,
        fontSize: 16,
        color: '#1E1E1E',
        fontWeight: '600',
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '600',
        marginBottom: 10,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        color: '#6B7280',
        fontSize: 11,
        marginBottom: 8,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        gap: 10,
    },
    input: {
        flex: 1,
        paddingVertical: 14,
        color: '#1E1E1E',
        fontSize: 15,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        padding: 24,
        paddingBottom: 40,
    },
    saveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#2563EB',
        paddingVertical: 16,
        borderRadius: 14,
        gap: 8,
    },
    saveBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});
