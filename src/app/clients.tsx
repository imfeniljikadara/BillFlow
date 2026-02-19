import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, Modal, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { useAppStore } from '../store/appStore';
import { useTheme } from '../contexts/ThemeContext';
import { Client } from '../types';

const { width } = Dimensions.get('window');

export default function ClientsScreen() {
    const router = useRouter();
    const { clients, invoices, addClient, updateClient, deleteClient } = useAppStore();
    const { isDark, colors } = useTheme();

    const [searchQuery, setSearchQuery] = useState('');
    const [isModalVisible, setModalVisible] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);

    // Form State
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [clientNotes, setClientNotes] = useState('');

    const filteredClients = useMemo(() => {
        if (!searchQuery.trim()) return clients;
        const q = searchQuery.toLowerCase();
        return clients.filter(c =>
            c.name.toLowerCase().includes(q) ||
            c.email?.toLowerCase().includes(q) ||
            c.phone?.includes(q)
        );
    }, [clients, searchQuery]);

    // Get invoice stats per client
    const getClientStats = (clientName: string) => {
        const clientInvoices = invoices.filter(inv => inv.clientName === clientName);
        const totalAmount = clientInvoices.reduce((sum, inv) => sum + inv.amount, 0);
        const pendingAmount = clientInvoices.filter(inv => inv.status === 'PENDING').reduce((sum, inv) => sum + inv.amount, 0);
        return { count: clientInvoices.length, totalAmount, pendingAmount };
    };

    const openAddModal = () => {
        setEditingClient(null);
        setName('');
        setEmail('');
        setPhone('');
        setAddress('');
        setClientNotes('');
        setModalVisible(true);
    };

    const openEditModal = (client: Client) => {
        setEditingClient(client);
        setName(client.name);
        setEmail(client.email || '');
        setPhone(client.phone || '');
        setAddress(client.address || '');
        setClientNotes(client.notes || '');
        setModalVisible(true);
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Client name is required');
            return;
        }

        try {
            const clientData: any = {
                name: name.trim(),
                createdAt: editingClient?.createdAt || new Date().toISOString(),
            };
            if (email.trim()) clientData.email = email.trim();
            if (phone.trim()) clientData.phone = phone.trim();
            if (address.trim()) clientData.address = address.trim();
            if (clientNotes.trim()) clientData.notes = clientNotes.trim();

            if (editingClient) {
                await updateClient(editingClient.id, clientData);
            } else {
                await addClient(clientData);
            }
            setModalVisible(false);
        } catch (e) {
            Alert.alert('Error', 'Failed to save client');
        }
    };

    const handleDelete = (client: Client) => {
        Alert.alert(
            'Delete Client',
            `Delete ${client.name}? This won't delete their invoices.`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => deleteClient(client.id) }
            ]
        );
    };

    const renderClient = ({ item }: { item: Client }) => {
        const stats = getClientStats(item.name);
        return (
            <TouchableOpacity
                style={[styles.clientCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => openEditModal(item)}
            >
                <View style={[styles.avatar, { backgroundColor: isDark ? colors.inputBg : '#EFF6FF' }]}>
                    <Text style={[styles.avatarText, { color: colors.primary }]}>
                        {item.name.substring(0, 2).toUpperCase()}
                    </Text>
                </View>
                <View style={styles.clientInfo}>
                    <Text style={[styles.clientName, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[styles.clientDetail, { color: colors.textSecondary }]}>
                        {item.email || item.phone || 'No contact info'}
                    </Text>
                    {stats.count > 0 && (
                        <View style={styles.statsRow}>
                            <Text style={[styles.statText, { color: colors.textSecondary }]}>
                                {stats.count} invoice{stats.count > 1 ? 's' : ''} • ₹{stats.totalAmount.toLocaleString('en-IN')}
                            </Text>
                            {stats.pendingAmount > 0 && (
                                <Text style={[styles.pendingText, { color: '#F59E0B' }]}>
                                    ₹{stats.pendingAmount.toLocaleString('en-IN')} pending
                                </Text>
                            )}
                        </View>
                    )}
                </View>
                <View style={styles.cardActions}>
                    <TouchableOpacity 
                        onPress={(e) => {
                            e.stopPropagation();
                            router.push(`/create?clientId=${item.id}&clientName=${encodeURIComponent(item.name)}&clientEmail=${encodeURIComponent(item.email || '')}&clientPhone=${encodeURIComponent(item.phone || '')}`);
                        }}
                        style={[styles.useBtn, { backgroundColor: colors.primary }]}
                    >
                        <Feather name="plus" size={14} color="#FFF" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                        onPress={(e) => {
                            e.stopPropagation();
                            handleDelete(item);
                        }} 
                        style={styles.deleteBtn}
                    >
                        <Feather name="trash-2" size={16} color="#EF4444" />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={isDark ? 'light' : 'dark'} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.inputBg }]}>
                    <Feather name="arrow-left" size={22} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Clients</Text>
                <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={openAddModal}>
                    <Feather name="plus" size={22} color="#FFF" />
                </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="search" size={18} color={colors.textSecondary} />
                <TextInput
                    style={[styles.searchInput, { color: colors.text }]}
                    placeholder="Search clients..."
                    placeholderTextColor={colors.textSecondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Feather name="x" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                )}
            </View>

            <Text style={[styles.resultCount, { color: colors.textSecondary }]}>
                {filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''}
            </Text>

            {/* Client List */}
            <FlatList
                data={filteredClients}
                keyExtractor={(item) => item.id}
                renderItem={renderClient}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Feather name="users" size={48} color={colors.textSecondary} />
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>
                            {searchQuery ? 'No clients found' : 'No clients yet'}
                        </Text>
                        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                            {searchQuery ? 'Try a different search' : 'Save client details to reuse in invoices'}
                        </Text>
                        {!searchQuery && (
                            <TouchableOpacity style={styles.emptyButton} onPress={openAddModal}>
                                <Feather name="plus" size={18} color="#FFF" />
                                <Text style={styles.emptyButtonText}>Add Client</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                }
            />

            {/* Add/Edit Modal */}
            <Modal visible={isModalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>
                            {editingClient ? 'Edit Client' : 'New Client'}
                        </Text>

                        <Text style={[styles.label, { color: colors.textSecondary }]}>NAME *</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                            placeholder="Client name"
                            placeholderTextColor={colors.textSecondary}
                            value={name}
                            onChangeText={setName}
                        />

                        <Text style={[styles.label, { color: colors.textSecondary }]}>EMAIL</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                            placeholder="client@email.com"
                            placeholderTextColor={colors.textSecondary}
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />

                        <Text style={[styles.label, { color: colors.textSecondary }]}>PHONE</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                            placeholder="+91 98765 43210"
                            placeholderTextColor={colors.textSecondary}
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                        />

                        <Text style={[styles.label, { color: colors.textSecondary }]}>ADDRESS</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                            placeholder="Business address"
                            placeholderTextColor={colors.textSecondary}
                            value={address}
                            onChangeText={setAddress}
                        />

                        <Text style={[styles.label, { color: colors.textSecondary }]}>NOTES</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }, { height: 80 }]}
                            placeholder="Internal notes (max 500 chars)"
                            placeholderTextColor={colors.textSecondary}
                            value={clientNotes}
                            onChangeText={(text) => setClientNotes(text.substring(0, 500))}
                            multiline
                            maxLength={500}
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalBtn, { backgroundColor: colors.inputBg }]}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                                onPress={handleSave}
                            >
                                <Text style={[styles.modalBtnText, { color: '#FFF' }]}>
                                    {editingClient ? 'Update' : 'Save'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 60, paddingHorizontal: 24, paddingBottom: 20,
    },
    backBtn: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '600' },
    addBtn: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    searchBar: {
        flexDirection: 'row', alignItems: 'center', marginHorizontal: 24,
        paddingHorizontal: 16, height: 50, borderRadius: 14, borderWidth: 1, gap: 12, marginBottom: 12,
    },
    searchInput: { flex: 1, fontSize: 15 },
    resultCount: { paddingHorizontal: 24, marginBottom: 12, fontSize: 13 },
    listContent: { paddingHorizontal: 24, paddingBottom: 100 },
    clientCard: {
        flexDirection: 'row', alignItems: 'center', padding: 16,
        borderRadius: 16, borderWidth: 1, marginBottom: 10,
    },
    avatar: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 16, fontWeight: '600' },
    clientInfo: { flex: 1, marginLeft: 14 },
    clientName: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
    clientDetail: { fontSize: 13 },
    statsRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
    statText: { fontSize: 11 },
    pendingText: { fontSize: 11, fontWeight: '600' },
    cardActions: {
        flexDirection: 'row',
        gap: 8,
    },
    useBtn: {
        width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    },
    deleteBtn: {
        width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    },
    emptyContainer: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40 },
    emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: 16, marginBottom: 8 },
    emptySubtitle: { fontSize: 14, textAlign: 'center', marginBottom: 24 },
    emptyButton: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#2563EB',
        paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14, gap: 8,
    },
    emptyButtonText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
    modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 24, textAlign: 'center' },
    label: { fontSize: 11, marginBottom: 6, fontWeight: '600', letterSpacing: 0.5 },
    input: { borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 14, borderWidth: 1 },
    modalButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
    modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    modalBtnText: { fontSize: 16, fontWeight: '600' },
});
