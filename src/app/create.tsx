import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Modal, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAppStore } from '../store/appStore';
import { useTheme } from '../contexts/ThemeContext';

type InvoiceItem = {
    description: string;
    quantity: number;
    price: number;
};

export default function CreateInvoiceScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { products, clients, addInvoice, addClient, userProfile } = useAppStore();
    const { isDark, colors } = useTheme();

    // Form State
    const [clientName, setClientName] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [selectedClientId, setSelectedClientId] = useState<string | undefined>(undefined);
    const [items, setItems] = useState<InvoiceItem[]>([{ description: '', quantity: 1, price: 0 }]);
    const [notes, setNotes] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showLibrary, setShowLibrary] = useState(false);
    const [showClientPicker, setShowClientPicker] = useState(false);
    const [saveAsNewClient, setSaveAsNewClient] = useState(false);
    const [loading, setLoading] = useState(false);
    
    // Recurring invoice state
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurrenceInterval, setRecurrenceInterval] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
    const [showRecurrencePicker, setShowRecurrencePicker] = useState(false);

    // Validation
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    // Handle pre-filled client data from URL params
    useEffect(() => {
        if (params.clientId && typeof params.clientId === 'string') {
            setSelectedClientId(params.clientId);
        }
        if (params.clientName && typeof params.clientName === 'string') {
            setClientName(decodeURIComponent(params.clientName));
        }
        if (params.clientEmail && typeof params.clientEmail === 'string' && params.clientEmail !== '') {
            setClientEmail(decodeURIComponent(params.clientEmail));
        }
        if (params.clientPhone && typeof params.clientPhone === 'string' && params.clientPhone !== '') {
            setClientPhone(decodeURIComponent(params.clientPhone));
        }
    }, [params]);

    const handleDateChange = (event: any, date?: Date) => {
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
        }
        if (date) {
            setSelectedDate(date);
            const isoDate = date.toISOString().split('T')[0];
            setDueDate(isoDate);
        }
    };

    const formatDateDisplay = (dateStr: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    };

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

    const addFromLibrary = (product: { name: string; price: number }) => {
        setItems([...items, { description: product.name, quantity: 1, price: product.price }]);
        setShowLibrary(false);
    };

    const selectClient = (client: { id: string; name: string; email?: string; phone?: string }) => {
        setClientName(client.name);
        setClientEmail(client.email || '');
        setClientPhone(client.phone || '');
        setSelectedClientId(client.id);
        setShowClientPicker(false);
        setSaveAsNewClient(false); // Don't save if selecting existing client
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

    const handleCreate = async () => {
        if (!validate()) {
            return;
        }

        setLoading(true);
        try {
            const validItems = items.filter(i => i.description.trim() && i.price > 0);

            // Save as new client if checkbox is checked and not selecting existing
            if (saveAsNewClient && !selectedClientId) {
                const clientData: any = {
                    name: clientName.trim(),
                    createdAt: new Date().toISOString(),
                };
                if (clientEmail.trim()) clientData.email = clientEmail.trim();
                if (clientPhone.trim()) clientData.phone = clientPhone.trim();
                
                try {
                    await addClient(clientData);
                } catch (e) {
                    console.error('Failed to save client:', e);
                }
            }

            // Build invoice object, excluding undefined fields
            const invoiceData: any = {
                clientName: clientName.trim(),
                items: validItems,
                amount: grandTotal,
                notes: notes.trim(),
                status: 'PENDING',
                dateCreated: new Date().toISOString(),
            };

            // Only add optional fields if they have values
            if (clientEmail.trim()) {
                invoiceData.clientEmail = clientEmail.trim();
            }
            if (clientPhone.trim()) {
                invoiceData.clientPhone = clientPhone.trim();
            }
            if (dueDate) {
                invoiceData.dueDate = dueDate;
            }
            if (selectedClientId) {
                invoiceData.clientId = selectedClientId;
            }

            // Add recurring invoice fields
            if (isRecurring) {
                invoiceData.isRecurring = true;
                invoiceData.recurrenceInterval = recurrenceInterval;
                
                // Calculate next recurrence date
                const now = new Date();
                const nextDate = new Date(now);
                
                switch (recurrenceInterval) {
                    case 'weekly':
                        nextDate.setDate(nextDate.getDate() + 7);
                        break;
                    case 'monthly':
                        nextDate.setMonth(nextDate.getMonth() + 1);
                        break;
                    case 'yearly':
                        nextDate.setFullYear(nextDate.getFullYear() + 1);
                        break;
                }
                
                invoiceData.nextRecurrenceDate = nextDate.toISOString();
            }

            await addInvoice(invoiceData);

            Alert.alert(
                '🎉 Invoice Created!',
                `Invoice for ${clientName} (₹${grandTotal.toLocaleString()}) has been created successfully.`,
                [
                    { text: 'Create Another', onPress: () => resetForm() },
                    { text: 'View Invoice', onPress: () => router.back() }
                ]
            );
        } catch (e) {
            Alert.alert('Error', 'Failed to create invoice. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setClientName('');
        setClientEmail('');
        setClientPhone('');
        setSelectedClientId(undefined);
        setSaveAsNewClient(false);
        setItems([{ description: '', quantity: 1, price: 0 }]);
        setNotes('');
        setDueDate('');
        setErrors({});
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
                <Text style={[styles.headerTitle, { color: colors.text }]}>New Invoice</Text>
                <TouchableOpacity onPress={resetForm} style={[styles.resetBtn, { backgroundColor: colors.inputBg }]}>
                    <Feather name="refresh-cw" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Client Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Client Details</Text>
                        {clients.length > 0 && (
                            <TouchableOpacity onPress={() => setShowClientPicker(true)} style={styles.clientPickerBtn}>
                                <Feather name="users" size={16} color={colors.primary} />
                                <Text style={[styles.clientPickerBtnText, { color: colors.primary }]}>Choose Client</Text>
                            </TouchableOpacity>
                        )}
                    </View>
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

                        {/* Save as new client checkbox */}
                        {!selectedClientId && clientName.trim() && (
                            <TouchableOpacity 
                                style={styles.checkboxRow} 
                                onPress={() => setSaveAsNewClient(!saveAsNewClient)}
                            >
                                <View style={[styles.checkbox, { borderColor: colors.border }]}>
                                    {saveAsNewClient && (
                                        <Feather name="check" size={16} color={colors.primary} />
                                    )}
                                </View>
                                <Text style={[styles.checkboxLabel, { color: colors.text }]}>
                                    Save as new client for future invoices
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Items Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Items *</Text>
                        {products.length > 0 && (
                            <TouchableOpacity onPress={() => setShowLibrary(true)} style={styles.libraryBtn}>
                                <Feather name="folder" size={16} color={colors.primary} />
                                <Text style={[styles.libraryBtnText, { color: colors.primary }]}>Library ({products.length})</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {errors.items && (
                        <View style={styles.errorBanner}>
                            <Feather name="alert-circle" size={16} color="#EF4444" />
                            <Text style={styles.errorBannerText}>{errors.items}</Text>
                        </View>
                    )}

                    {items.map((item, index) => (
                        <View key={index} style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <View style={styles.itemHeader}>
                                <View style={styles.itemNumberBadge}>
                                    <Text style={styles.itemNumberText}>{index + 1}</Text>
                                </View>
                                {items.length > 1 && (
                                    <TouchableOpacity onPress={() => removeItem(index)} style={styles.removeBtn}>
                                        <Feather name="trash-2" size={16} color="#EF4444" />
                                    </TouchableOpacity>
                                )}
                            </View>

                            <TextInput
                                style={[styles.itemInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                                placeholder="Item description"
                                placeholderTextColor={colors.textSecondary}
                                value={item.description}
                                onChangeText={(v) => updateItem(index, 'description', v)}
                            />

                            <View style={styles.itemRow}>
                                <View style={styles.itemCol}>
                                    <Text style={[styles.miniLabel, { color: colors.textSecondary }]}>QTY</Text>
                                    <TextInput
                                        style={[styles.miniInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                                        keyboardType="numeric"
                                        value={String(item.quantity)}
                                        onChangeText={(v) => updateItem(index, 'quantity', parseInt(v) || 1)}
                                    />
                                </View>
                                <View style={[styles.itemCol, { flex: 2 }]}>
                                    <Text style={[styles.miniLabel, { color: colors.textSecondary }]}>PRICE (₹)</Text>
                                    <TextInput
                                        style={[styles.miniInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                                        keyboardType="numeric"
                                        value={item.price > 0 ? String(item.price) : ''}
                                        placeholder="0"
                                        placeholderTextColor={colors.textSecondary}
                                        onChangeText={(v) => updateItem(index, 'price', parseFloat(v) || 0)}
                                    />
                                </View>
                                <View style={[styles.itemCol, { alignItems: 'flex-end' }]}>
                                    <Text style={[styles.miniLabel, { color: colors.textSecondary }]}>TOTAL</Text>
                                    <Text style={[styles.itemTotal, { color: colors.text }]}>₹{(item.quantity * item.price).toLocaleString()}</Text>
                                </View>
                            </View>
                        </View>
                    ))}

                    <TouchableOpacity style={[styles.addItemBtn, { borderColor: colors.border }]} onPress={addItem}>
                        <Feather name="plus" size={18} color={colors.primary} />
                        <Text style={[styles.addItemText, { color: colors.primary }]}>Add Another Item</Text>
                    </TouchableOpacity>
                </View>

                {/* Notes Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Notes</Text>
                    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <TextInput
                            style={[styles.notesInput, { color: colors.text }]}
                            placeholder="Payment terms, thank you message, etc..."
                            placeholderTextColor={colors.textSecondary}
                            value={notes}
                            onChangeText={setNotes}
                            multiline
                            numberOfLines={4}
                        />
                    </View>
                </View>

                {/* Due Date Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Due Date (Optional)</Text>
                    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <TouchableOpacity
                            style={[styles.datePickerButton, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                            onPress={() => setShowDatePicker(true)}
                        >
                            <Feather name="calendar" size={18} color={colors.textSecondary} />
                            <Text style={[styles.datePickerText, { color: dueDate ? colors.text : colors.textSecondary }]}>
                                {dueDate ? formatDateDisplay(dueDate) : 'Select due date'}
                            </Text>
                            {dueDate && (
                                <TouchableOpacity onPress={() => setDueDate('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                    <Feather name="x" size={18} color={colors.textSecondary} />
                                </TouchableOpacity>
                            )}
                        </TouchableOpacity>
                        {showDatePicker && (
                            <DateTimePicker
                                value={selectedDate}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={handleDateChange}
                            />
                        )}
                        {Platform.OS === 'ios' && showDatePicker && (
                            <TouchableOpacity 
                                style={styles.datePickerClose}
                                onPress={() => setShowDatePicker(false)}
                            >
                                <Text style={{ color: colors.primary, fontWeight: '600' }}>Done</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Recurring Invoice Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Recurring Invoice</Text>
                    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <TouchableOpacity 
                            style={styles.recurringToggle}
                            onPress={() => setIsRecurring(!isRecurring)}
                        >
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.recurringLabel, { color: colors.text }]}>Make this recurring</Text>
                                <Text style={[styles.recurringSubtext, { color: colors.textSecondary }]}>
                                    Auto-generate invoices at regular intervals
                                </Text>
                            </View>
                            <View style={[styles.toggleSwitch, { 
                                backgroundColor: isRecurring ? colors.primary : colors.border,
                                borderWidth: isRecurring ? 0 : 1,
                                borderColor: colors.border
                            }]}>
                                <View style={[styles.toggleKnob, { transform: [{ translateX: isRecurring ? 20 : 0 }] }]} />
                            </View>
                        </TouchableOpacity>

                        {isRecurring && (
                            <View style={styles.recurringOptions}>
                                <Text style={[styles.label, { color: colors.textSecondary }]}>RECURRENCE INTERVAL</Text>
                                <View style={styles.intervalButtons}>
                                    {(['weekly', 'monthly', 'yearly'] as const).map((interval) => (
                                        <TouchableOpacity
                                            key={interval}
                                            style={[
                                                styles.intervalBtn,
                                                {
                                                    backgroundColor: recurrenceInterval === interval ? colors.primary : colors.inputBg,
                                                    borderColor: colors.border,
                                                }
                                            ]}
                                            onPress={() => setRecurrenceInterval(interval)}
                                        >
                                            <Text style={[
                                                styles.intervalBtnText,
                                                { color: recurrenceInterval === interval ? '#FFF' : colors.text }
                                            ]}>
                                                {interval.charAt(0).toUpperCase() + interval.slice(1)}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                <View style={[styles.recurringInfo, { backgroundColor: colors.inputBg }]}>
                                    <Feather name="info" size={14} color={colors.primary} />
                                    <Text style={[styles.recurringInfoText, { color: colors.textSecondary }]}>
                                        Next invoice will be generated {recurrenceInterval === 'weekly' ? 'next week' : recurrenceInterval === 'monthly' ? 'next month' : 'next year'}
                                    </Text>
                                </View>
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* Footer */}
            <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
                <View style={styles.totalSection}>
                    <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Grand Total</Text>
                    <Text style={[styles.totalAmount, { color: colors.text }]}>₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
                </View>
                <TouchableOpacity
                    style={[styles.createBtn, loading && styles.createBtnDisabled]}
                    onPress={handleCreate}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <>
                            <Text style={styles.createBtnText}>Create Invoice</Text>
                            <Feather name="check" size={20} color="#FFF" />
                        </>
                    )}
                </TouchableOpacity>
            </View>

            {/* Client Picker Modal */}
            <Modal visible={showClientPicker} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Client</Text>
                            <TouchableOpacity onPress={() => setShowClientPicker(false)}>
                                <Feather name="x" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <FlatList
                            data={clients}
                            keyExtractor={(item) => item.id}
                            ListEmptyComponent={
                                <View style={styles.emptyLibrary}>
                                    <Feather name="users" size={40} color={colors.textSecondary} />
                                    <Text style={[styles.emptyLibraryText, { color: colors.textSecondary }]}>No clients saved yet</Text>
                                    <Text style={[styles.emptyLibrarySubtext, { color: colors.textSecondary }]}>Add clients in "Clients" screen</Text>
                                </View>
                            }
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[styles.clientPickerItem, { borderBottomColor: colors.border }]}
                                    onPress={() => selectClient(item)}
                                >
                                    <View style={[styles.clientPickerAvatar, { backgroundColor: isDark ? colors.inputBg : '#EFF6FF' }]}>
                                        <Text style={[styles.clientPickerAvatarText, { color: colors.primary }]}>
                                            {item.name.substring(0, 2).toUpperCase()}
                                        </Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.clientPickerName, { color: colors.text }]}>{item.name}</Text>
                                        <Text style={[styles.clientPickerDetail, { color: colors.textSecondary }]}>
                                            {item.email || item.phone || 'No contact info'}
                                        </Text>
                                    </View>
                                    <Feather name="chevron-right" size={20} color={colors.textSecondary} />
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>

            {/* Library Modal */}
            <Modal visible={showLibrary} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.text }]}>Product Library</Text>
                            <TouchableOpacity onPress={() => setShowLibrary(false)}>
                                <Feather name="x" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <FlatList
                            data={products}
                            keyExtractor={(item) => item.id}
                            ListEmptyComponent={
                                <View style={styles.emptyLibrary}>
                                    <Feather name="package" size={40} color={colors.textSecondary} />
                                    <Text style={[styles.emptyLibraryText, { color: colors.textSecondary }]}>No products saved yet</Text>
                                    <Text style={[styles.emptyLibrarySubtext, { color: colors.textSecondary }]}>Add products in "Merchants" tab</Text>
                                </View>
                            }
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[styles.productItem, { borderBottomColor: colors.border }]}
                                    onPress={() => addFromLibrary(item)}
                                >
                                    <View style={[styles.productIcon, { backgroundColor: colors.inputBg }]}>
                                        <Feather name="package" size={18} color={colors.textSecondary} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.productName, { color: colors.text }]}>{item.name}</Text>
                                        <Text style={[styles.productPrice, { color: colors.textSecondary }]}>₹{item.price.toLocaleString()}</Text>
                                    </View>
                                    <Feather name="plus-circle" size={22} color={colors.primary} />
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>
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
    resetBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 24,
        paddingBottom: 200,
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
    libraryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    libraryBtnText: {
        fontSize: 14,
        fontWeight: '500',
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
    errorText: {
        color: '#EF4444',
        fontSize: 12,
        marginTop: 6,
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF2F2',
        padding: 12,
        borderRadius: 12,
        marginBottom: 12,
        gap: 8,
    },
    errorBannerText: {
        color: '#EF4444',
        fontSize: 13,
    },
    itemCard: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    itemNumberBadge: {
        width: 24,
        height: 24,
        borderRadius: 8,
        backgroundColor: '#2563EB',
        alignItems: 'center',
        justifyContent: 'center',
    },
    itemNumberText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '600',
    },
    removeBtn: {
        padding: 8,
    },
    itemInput: {
        borderRadius: 10,
        padding: 12,
        fontSize: 15,
        marginBottom: 12,
        borderWidth: 1,
    },
    itemRow: {
        flexDirection: 'row',
        gap: 12,
    },
    itemCol: {
        flex: 1,
    },
    miniLabel: {
        fontSize: 10,
        fontWeight: '600',
        marginBottom: 6,
        letterSpacing: 0.5,
    },
    miniInput: {
        borderRadius: 8,
        padding: 10,
        fontSize: 14,
        textAlign: 'center',
        borderWidth: 1,
    },
    itemTotal: {
        fontSize: 16,
        fontWeight: '700',
        marginTop: 6,
    },
    addItemBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        gap: 8,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderRadius: 14,
    },
    addItemText: {
        fontSize: 14,
        fontWeight: '600',
    },
    notesInput: {
        fontSize: 15,
        minHeight: 80,
        textAlignVertical: 'top',
    },
    datePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        gap: 12,
    },
    datePickerText: {
        flex: 1,
        fontSize: 15,
    },
    datePickerClose: {
        paddingVertical: 12,
        alignItems: 'center',
        borderTopWidth: 1,
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
    totalSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    totalLabel: {
        fontSize: 14,
    },
    totalAmount: {
        fontSize: 24,
        fontWeight: '700',
    },
    createBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#2563EB',
        paddingVertical: 16,
        borderRadius: 14,
        gap: 8,
    },
    createBtnDisabled: {
        opacity: 0.7,
    },
    createBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        maxHeight: '70%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    productItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        gap: 14,
    },
    productIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    productName: {
        fontSize: 15,
        fontWeight: '600',
    },
    productPrice: {
        fontSize: 13,
        marginTop: 2,
    },
    emptyLibrary: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyLibraryText: {
        fontSize: 16,
        fontWeight: '500',
        marginTop: 16,
    },
    emptyLibrarySubtext: {
        fontSize: 13,
        marginTop: 4,
    },
    clientPickerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    clientPickerBtnText: {
        fontSize: 14,
        fontWeight: '500',
    },
    clientPickerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        gap: 14,
    },
    clientPickerAvatar: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    clientPickerAvatarText: {
        fontSize: 16,
        fontWeight: '600',
    },
    clientPickerName: {
        fontSize: 15,
        fontWeight: '600',
    },
    clientPickerDetail: {
        fontSize: 13,
        marginTop: 2,
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 8,
        gap: 12,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxLabel: {
        fontSize: 14,
        flex: 1,
    },
    recurringToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: 16,
        gap: 12,
    },
    recurringLabel: {
        fontSize: 15,
        fontWeight: '600',
    },
    recurringSubtext: {
        fontSize: 13,
        marginTop: 4,
    },
    toggleSwitch: {
        width: 50,
        height: 30,
        borderRadius: 15,
        padding: 3,
        justifyContent: 'center',
    },
    toggleKnob: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#FFF',
    },
    recurringOptions: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
        paddingTop: 16,
    },
    intervalButtons: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 8,
    },
    intervalBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        borderWidth: 1,
        alignItems: 'center',
    },
    intervalBtnText: {
        fontSize: 14,
        fontWeight: '600',
    },
    recurringInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        padding: 12,
        borderRadius: 10,
        gap: 8,
    },
    recurringInfoText: {
        fontSize: 12,
        flex: 1,
    },
});
