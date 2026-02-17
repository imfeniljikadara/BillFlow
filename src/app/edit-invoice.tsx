import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { useAppStore } from '../store/appStore';
import { useTheme } from '../contexts/ThemeContext';

type InvoiceItem = {
    description: string;
    quantity: number;
    price: number;
};

export default function EditInvoiceScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const { invoices, updateInvoice } = useAppStore();
    const { isDark, colors } = useTheme();

    const invoice = invoices.find(inv => inv.id === id);

    // Form State
    const [clientName, setClientName] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [items, setItems] = useState<InvoiceItem[]>([{ description: '', quantity: 1, price: 0 }]);
    const [notes, setNotes] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [loading, setLoading] = useState(false);

    // Validation
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        if (invoice) {
            setClientName(invoice.clientName);
            setClientEmail(invoice.clientEmail || '');
            setClientPhone(invoice.clientPhone || '');
            setItems(invoice.items || [{ description: '', quantity: 1, price: 0 }]);
            setNotes(invoice.notes || '');
            setDueDate(invoice.dueDate || '');
        }
    }, [invoice]);

    if (!invoice) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <StatusBar style={isDark ? 'light' : 'dark'} />
                <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                    <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.inputBg }]}>
                        <Feather name="arrow-left" size={22} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Edit Invoice</Text>
                    <View style={{ width: 44 }} />
                </View>
                <View style={styles.notFound}>
                    <Text style={[styles.notFoundText, { color: colors.text }]}>Invoice not found</Text>
                </View>
            </View>
        );
    }

    const validateEmail = (email: string) => {
        if (!email) return true;
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    };

    const validatePhone = (phone: string) => {
        if (!phone) return true;
        return phone.length >= 10;
    };

    const addItem = () => {
        setItems([...items, { description: '', quantity: 1, price: 0 }]);
    };

    const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
        const updated = [...items];
        updated[index] = { ...updated[index], [field]: value };
        setItems(updated);
    };

    const removeItem = (index: number) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    const grandTotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);

    const validate = () => {
        const newErrors: { [key: string]: string } = {};

        if (!clientName.trim()) {
            newErrors.clientName = 'Client name is required';
        }

        if (clientEmail && !validateEmail(clientEmail)) {
            newErrors.clientEmail = 'Please enter a valid email';
        }

        if (clientPhone && !validatePhone(clientPhone)) {
            newErrors.clientPhone = 'Please enter a valid phone number';
        }

        const validItems = items.filter(i => i.description.trim() && i.price > 0);
        if (validItems.length === 0) {
            newErrors.items = 'Add at least one item with description and price';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleUpdate = async () => {
        if (!validate()) {
            return;
        }

        setLoading(true);
        try {
            const validItems = items.filter(i => i.description.trim() && i.price > 0);

            // Build update object, excluding undefined fields
            const updateData: any = {
                clientName: clientName.trim(),
                items: validItems,
                amount: grandTotal,
                notes: notes.trim(),
            };

            // Only add optional fields if they have values
            if (clientEmail.trim()) {
                updateData.clientEmail = clientEmail.trim();
            }
            if (clientPhone.trim()) {
                updateData.clientPhone = clientPhone.trim();
            }
            if (dueDate) {
                updateData.dueDate = dueDate;
            }

            await updateInvoice(invoice.id, updateData);

            Alert.alert(
                '✅ Updated!',
                `Invoice for ${clientName} has been updated successfully.`,
                [
                    { text: 'OK', onPress: () => router.back() }
                ]
            );
        } catch (e) {
            Alert.alert('Error', 'Failed to update invoice. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <StatusBar style={isDark ? 'light' : 'dark'} />

            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.inputBg }]}>
                    <Feather name="arrow-left" size={22} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Edit Invoice</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Client Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Client Details</Text>
                    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>CLIENT NAME *</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: errors.clientName ? '#EF4444' : colors.border }]}>
                                <Feather name="user" size={18} color={colors.textSecondary} />
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    placeholder="John Doe"
                                    placeholderTextColor={colors.textSecondary}
                                    value={clientName}
                                    onChangeText={(t) => { setClientName(t); setErrors({ ...errors, clientName: '' }); }}
                                />
                            </View>
                            {errors.clientName && <Text style={styles.errorText}>{errors.clientName}</Text>}
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>EMAIL</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: errors.clientEmail ? '#EF4444' : colors.border }]}>
                                <Feather name="mail" size={18} color={colors.textSecondary} />
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    placeholder="client@email.com"
                                    placeholderTextColor={colors.textSecondary}
                                    value={clientEmail}
                                    onChangeText={(t) => { setClientEmail(t); setErrors({ ...errors, clientEmail: '' }); }}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>
                            {errors.clientEmail && <Text style={styles.errorText}>{errors.clientEmail}</Text>}
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>PHONE</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: errors.clientPhone ? '#EF4444' : colors.border }]}>
                                <Feather name="phone" size={18} color={colors.textSecondary} />
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    placeholder="+91 98765 43210"
                                    placeholderTextColor={colors.textSecondary}
                                    value={clientPhone}
                                    onChangeText={(t) => { setClientPhone(t); setErrors({ ...errors, clientPhone: '' }); }}
                                    keyboardType="phone-pad"
                                />
                            </View>
                            {errors.clientPhone && <Text style={styles.errorText}>{errors.clientPhone}</Text>}
                        </View>
                    </View>
                </View>

                {/* Items Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Invoice Items</Text>
                        <TouchableOpacity onPress={addItem} style={[styles.addItemBtn, { backgroundColor: colors.primary }]}>
                            <Feather name="plus" size={16} color="#FFF" />
                            <Text style={styles.addItemText}>Add Item</Text>
                        </TouchableOpacity>
                    </View>

                    {errors.items && <Text style={[styles.errorText, { marginBottom: 12, paddingHorizontal: 4 }]}>{errors.items}</Text>}

                    {items.map((item, index) => (
                        <View key={index} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 12 }]}>
                            <View style={styles.itemHeader}>
                                <Text style={[styles.itemNumber, { color: colors.text }]}>Item {index + 1}</Text>
                                {items.length > 1 && (
                                    <TouchableOpacity onPress={() => removeItem(index)}>
                                        <Feather name="trash-2" size={18} color="#EF4444" />
                                    </TouchableOpacity>
                                )}
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={[styles.label, { color: colors.textSecondary }]}>DESCRIPTION</Text>
                                <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                                    <TextInput
                                        style={[styles.input, { color: colors.text }]}
                                        placeholder="e.g. Website Development"
                                        placeholderTextColor={colors.textSecondary}
                                        value={item.description}
                                        onChangeText={(t) => updateItem(index, 'description', t)}
                                    />
                                </View>
                            </View>

                            <View style={styles.row}>
                                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                                    <Text style={[styles.label, { color: colors.textSecondary }]}>QUANTITY</Text>
                                    <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                                        <TextInput
                                            style={[styles.input, { color: colors.text }]}
                                            placeholder="1"
                                            placeholderTextColor={colors.textSecondary}
                                            value={String(item.quantity)}
                                            onChangeText={(t) => updateItem(index, 'quantity', parseInt(t) || 1)}
                                            keyboardType="numeric"
                                        />
                                    </View>
                                </View>

                                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                                    <Text style={[styles.label, { color: colors.textSecondary }]}>PRICE (₹)</Text>
                                    <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                                        <TextInput
                                            style={[styles.input, { color: colors.text }]}
                                            placeholder="0"
                                            placeholderTextColor={colors.textSecondary}
                                            value={String(item.price)}
                                            onChangeText={(t) => updateItem(index, 'price', parseFloat(t) || 0)}
                                            keyboardType="numeric"
                                        />
                                    </View>
                                </View>
                            </View>

                            <View style={styles.itemTotal}>
                                <Text style={[styles.itemTotalLabel, { color: colors.textSecondary }]}>Item Total:</Text>
                                <Text style={[styles.itemTotalValue, { color: colors.text }]}>₹{(item.quantity * item.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Notes Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Additional Details</Text>
                    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.textSecondary }]}>NOTES</Text>
                            <TextInput
                                style={[styles.textArea, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                                placeholder="Add any additional notes..."
                                placeholderTextColor={colors.textSecondary}
                                value={notes}
                                onChangeText={setNotes}
                                multiline
                                numberOfLines={4}
                            />
                        </View>
                    </View>
                </View>

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* Footer */}
            <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
                <View style={styles.totalRow}>
                    <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Total Amount</Text>
                    <Text style={[styles.totalAmount, { color: colors.text }]}>₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
                </View>
                <TouchableOpacity
                    style={[styles.updateBtn, loading && styles.updateBtnDisabled]}
                    onPress={handleUpdate}
                    disabled={loading}
                >
                    {loading ? (
                        <Text style={styles.updateBtnText}>Updating...</Text>
                    ) : (
                        <>
                            <Feather name="check" size={20} color="#FFF" />
                            <Text style={styles.updateBtnText}>Update Invoice</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
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
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 24,
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
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
        fontWeight: '600',
        marginBottom: 8,
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
    textArea: {
        borderRadius: 12,
        padding: 14,
        fontSize: 15,
        borderWidth: 1,
        textAlignVertical: 'top',
        minHeight: 100,
    },
    errorText: {
        color: '#EF4444',
        fontSize: 12,
        marginTop: 4,
    },
    addItemBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        gap: 6,
    },
    addItemText: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '600',
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    itemNumber: {
        fontSize: 14,
        fontWeight: '600',
    },
    row: {
        flexDirection: 'row',
    },
    itemTotal: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    itemTotalLabel: {
        fontSize: 13,
        fontWeight: '500',
    },
    itemTotalValue: {
        fontSize: 16,
        fontWeight: '700',
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
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    totalLabel: {
        fontSize: 14,
        fontWeight: '500',
    },
    totalAmount: {
        fontSize: 24,
        fontWeight: '700',
    },
    updateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#2563EB',
        paddingVertical: 16,
        borderRadius: 14,
        gap: 10,
    },
    updateBtnDisabled: {
        opacity: 0.5,
    },
    updateBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    notFound: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    notFoundText: {
        fontSize: 16,
        fontWeight: '600',
    },
});
