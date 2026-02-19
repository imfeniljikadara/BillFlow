import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, RefreshControl, Dimensions, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { useAppStore } from '../store/appStore';
import { useTheme } from '../contexts/ThemeContext';
import { Invoice } from '../types';
import { InvoiceCard } from '../components/InvoiceCard';
import { SwipeableInvoiceCard } from '../components/SwipeableInvoiceCard';

const { width } = Dimensions.get('window');

type FilterType = 'ALL' | 'PAID' | 'PENDING' | 'OVERDUE' | 'RECURRING';

export default function InvoicesScreen() {
    const router = useRouter();
    const { invoices, deleteInvoice, updateInvoice } = useAppStore();
    const { isDark, colors } = useTheme();

    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');
    const [refreshing, setRefreshing] = useState(false);
    const [sortBy, setSortBy] = useState<'date' | 'amount' | 'client'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [minAmount, setMinAmount] = useState('');
    const [maxAmount, setMaxAmount] = useState('');

    // Filter and search invoices
    const filteredInvoices = useMemo(() => {
        let result = [...invoices];

        // Apply status filter
        if (activeFilter === 'RECURRING') {
            result = result.filter(inv => inv.isRecurring === true);
        } else if (activeFilter !== 'ALL') {
            result = result.filter(inv => inv.status === activeFilter);
        }

        // Apply search (including items)
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(inv => {
                const matchesClient = inv.clientName.toLowerCase().includes(query) ||
                    inv.clientEmail?.toLowerCase().includes(query) ||
                    inv.id.toLowerCase().includes(query);
                
                const matchesItems = inv.items?.some(item => 
                    item.description.toLowerCase().includes(query)
                );
                
                return matchesClient || matchesItems;
            });
        }

        // Apply amount filter
        if (minAmount) {
            const min = parseFloat(minAmount);
            result = result.filter(inv => inv.amount >= min);
        }
        if (maxAmount) {
            const max = parseFloat(maxAmount);
            result = result.filter(inv => inv.amount <= max);
        }

        // Sort
        result.sort((a, b) => {
            let comparison = 0;
            
            switch (sortBy) {
                case 'date':
                    comparison = new Date(a.dateCreated).getTime() - new Date(b.dateCreated).getTime();
                    break;
                case 'amount':
                    comparison = a.amount - b.amount;
                    break;
                case 'client':
                    comparison = a.clientName.localeCompare(b.clientName);
                    break;
            }
            
            return sortOrder === 'asc' ? comparison : -comparison;
        });

        return result;
    }, [invoices, activeFilter, searchQuery, minAmount, maxAmount, sortBy, sortOrder]);

    // Stats
    const stats = useMemo(() => ({
        all: invoices.length,
        paid: invoices.filter(inv => inv.status === 'PAID').length,
        pending: invoices.filter(inv => inv.status === 'PENDING').length,
        overdue: invoices.filter(inv => inv.status === 'OVERDUE').length,
        recurring: invoices.filter(inv => inv.isRecurring === true).length,
    }), [invoices]);

    // Removed inline getStatusColor helper

    // Removed inline formatDate helper as it's now handled in InvoiceCard

    const onRefresh = () => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 1000);
    };

    const filters: { key: FilterType; label: string; count: number }[] = [
        { key: 'ALL', label: 'All', count: stats.all },
        { key: 'PENDING', label: 'Pending', count: stats.pending },
        { key: 'PAID', label: 'Paid', count: stats.paid },
        { key: 'OVERDUE', label: 'Overdue', count: stats.overdue },
        { key: 'RECURRING', label: 'Recurring', count: stats.recurring },
    ];

    const renderInvoice = ({ item, index }: { item: Invoice, index: number }) => (
        <SwipeableInvoiceCard
            invoice={item}
            colors={colors}
            isDark={isDark}
            onPressCard={() => router.push(`/invoice/${item.id}`)}
            onDelete={() => {
                Alert.alert(
                    'Delete Invoice',
                    `Are you sure you want to delete the invoice for ${item.clientName}?`,
                    [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: async () => {
                                try {
                                    await deleteInvoice(item.id);
                                    Alert.alert('Success', 'Invoice deleted successfully');
                                } catch (error) {
                                    Alert.alert('Error', 'Failed to delete invoice');
                                }
                            }
                        }
                    ]
                );
            }}
            onMarkPaid={() => {
                Alert.alert(
                    'Mark as Paid',
                    `Mark the invoice for ${item.clientName} as paid?`,
                    [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Mark Paid',
                            style: 'default',
                            onPress: async () => {
                                try {
                                    await updateInvoice(item.id, { status: 'PAID' });
                                    Alert.alert('Success', 'Invoice marked as paid');
                                } catch (error) {
                                    Alert.alert('Error', 'Failed to update invoice');
                                }
                            }
                        }
                    ]
                );
            }}
        >
            <InvoiceCard invoice={item} index={index} />
        </SwipeableInvoiceCard>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconBox, { backgroundColor: isDark ? colors.inputBg : '#EFF6FF' }]}>
                <Feather name="inbox" size={40} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {searchQuery ? 'No results found' : 'No invoices yet'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                {searchQuery
                    ? `We couldn't find any invoices matching "${searchQuery}"`
                    : 'Create your first invoice to get started with tracking payments'
                }
            </Text>
            {!searchQuery && (
                <TouchableOpacity
                    style={styles.emptyButton}
                    onPress={() => router.push('/create')}
                >
                    <Feather name="plus" size={18} color="#FFF" />
                    <Text style={styles.emptyButtonText}>Create Invoice</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={isDark ? 'light' : 'dark'} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.inputBg }]}>
                    <Feather name="arrow-left" size={22} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>All Invoices</Text>
                <TouchableOpacity
                    style={[styles.addBtn, { backgroundColor: colors.primary }]}
                    onPress={() => router.push('/create')}
                >
                    <Feather name="plus" size={22} color="#FFF" />
                </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="search" size={18} color={colors.textSecondary} />
                <TextInput
                    style={[styles.searchInput, { color: colors.text }]}
                    placeholder="Search by name, items, email..."
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

            {/* Sort and Filter Controls */}
            <View style={styles.controlsRow}>
                {/* Sort Selector */}
                <TouchableOpacity 
                    style={[styles.sortBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => {
                        if (sortBy === 'date') {
                            setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                        } else {
                            setSortBy('date');
                            setSortOrder('desc');
                        }
                    }}
                >
                    <Feather name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'} size={16} color={colors.text} />
                    <Text style={[styles.sortBtnText, { color: colors.text }]}>
                        {sortBy === 'date' ? 'Date' : sortBy === 'amount' ? 'Amount' : 'Client'}
                    </Text>
                </TouchableOpacity>

                {/* Sort Options */}
                <View style={styles.sortOptions}>
                    {['date', 'amount', 'client'].map((option) => (
                        <TouchableOpacity
                            key={option}
                            style={[
                                styles.sortOption,
                                {
                                    backgroundColor: sortBy === option ? colors.primary : colors.card,
                                    borderColor: colors.border,
                                }
                            ]}
                            onPress={() => setSortBy(option as any)}
                        >
                            <Text style={[
                                styles.sortOptionText,
                                { color: sortBy === option ? '#FFF' : colors.text }
                            ]}>
                                {option.charAt(0).toUpperCase() + option.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Advanced Filter Toggle */}
                <TouchableOpacity
                    style={[styles.filterToggleBtn, { backgroundColor: showAdvancedFilters ? colors.primary : colors.card, borderColor: colors.border }]}
                    onPress={() => setShowAdvancedFilters(!showAdvancedFilters)}
                >
                    <Feather name="sliders" size={16} color={showAdvancedFilters ? '#FFF' : colors.text} />
                </TouchableOpacity>
            </View>

            {/* Advanced Filters */}
            {showAdvancedFilters && (
                <View style={[styles.advancedFilters, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.advancedTitle, { color: colors.text }]}>Amount Range</Text>
                    <View style={styles.amountRow}>
                        <View style={[styles.amountInput, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                            <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>Min</Text>
                            <TextInput
                                style={[styles.amountField, { color: colors.text }]}
                                placeholder="0"
                                placeholderTextColor={colors.textSecondary}
                                keyboardType="numeric"
                                value={minAmount}
                                onChangeText={setMinAmount}
                            />
                        </View>
                        <Text style={[styles.amountSeparator, { color: colors.textSecondary }]}>to</Text>
                        <View style={[styles.amountInput, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                            <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>Max</Text>
                            <TextInput
                                style={[styles.amountField, { color: colors.text }]}
                                placeholder="∞"
                                placeholderTextColor={colors.textSecondary}
                                keyboardType="numeric"
                                value={maxAmount}
                                onChangeText={setMaxAmount}
                            />
                        </View>
                    </View>
                    {(minAmount || maxAmount) && (
                        <TouchableOpacity
                            style={[styles.clearFiltersBtn, { backgroundColor: colors.inputBg }]}
                            onPress={() => {
                                setMinAmount('');
                                setMaxAmount('');
                            }}
                        >
                            <Feather name="x" size={14} color={colors.textSecondary} />
                            <Text style={[styles.clearFiltersText, { color: colors.textSecondary }]}>Clear Filters</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Filter Tabs */}
            <View style={styles.filterContainer}>
                <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={filters}
                    keyExtractor={(item) => item.key}
                    contentContainerStyle={styles.filterList}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={[
                                styles.filterTab,
                                {
                                    backgroundColor: activeFilter === item.key ? colors.primary : colors.card,
                                    borderColor: activeFilter === item.key ? colors.primary : colors.border,
                                }
                            ]}
                            onPress={() => setActiveFilter(item.key)}
                        >
                            <Text style={[
                                styles.filterLabel,
                                { color: activeFilter === item.key ? '#FFF' : colors.text }
                            ]}>
                                {item.label}
                            </Text>
                            <View style={[
                                styles.filterCount,
                                { backgroundColor: activeFilter === item.key ? 'rgba(255,255,255,0.2)' : colors.inputBg }
                            ]}>
                                <Text style={[
                                    styles.filterCountText,
                                    { color: activeFilter === item.key ? '#FFF' : colors.textSecondary }
                                ]}>
                                    {item.count}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    )}
                />
            </View>

            {/* Results count */}
            <View style={styles.resultsHeader}>
                <Text style={[styles.resultsCount, { color: colors.textSecondary }]}>
                    {filteredInvoices.length} {filteredInvoices.length === 1 ? 'invoice' : 'invoices'} found
                </Text>
            </View>

            {/* Invoice List */}
            <FlatList
                data={filteredInvoices}
                keyExtractor={(item) => item.id}
                renderItem={renderInvoice}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                }
                ListEmptyComponent={renderEmptyState}
            />
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
    addBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 24,
        paddingHorizontal: 16,
        height: 50,
        borderRadius: 14,
        borderWidth: 1,
        gap: 12,
        marginBottom: 16,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
    },
    filterContainer: {
        marginBottom: 16,
    },
    filterList: {
        paddingHorizontal: 24,
        gap: 10,
    },
    filterTab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        gap: 8,
    },
    filterLabel: {
        fontSize: 14,
        fontWeight: '500',
    },
    filterCount: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    filterCountText: {
        fontSize: 12,
        fontWeight: '600',
    },
    resultsHeader: {
        paddingHorizontal: 24,
        marginBottom: 12,
    },
    resultsCount: {
        fontSize: 13,
    },
    listContent: {
        paddingHorizontal: 24,
        paddingBottom: 100,
    },
    invoiceCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 18,
        marginBottom: 10,
        borderWidth: 1,
    },
    invoiceAvatar: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    invoiceAvatarText: {
        fontSize: 15,
        fontWeight: '600',
    },
    invoiceInfo: {
        flex: 1,
        marginLeft: 14,
    },
    invoiceName: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 4,
    },
    invoiceId: {
        fontSize: 12,
    },
    invoiceRight: {
        alignItems: 'flex-end',
    },
    invoiceAmount: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 6,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: 40,
    },
    emptyIconBox: {
        width: 80,
        height: 80,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    emptyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2563EB',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 14,
        gap: 8,
    },
    emptyButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
    controlsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        marginBottom: 16,
        gap: 10,
    },
    sortBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        gap: 6,
    },
    sortBtnText: {
        fontSize: 13,
        fontWeight: '600',
    },
    sortOptions: {
        flexDirection: 'row',
        flex: 1,
        gap: 6,
    },
    sortOption: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderRadius: 10,
        borderWidth: 1,
        alignItems: 'center',
    },
    sortOptionText: {
        fontSize: 12,
        fontWeight: '600',
    },
    filterToggleBtn: {
        width: 40,
        height: 40,
        borderRadius: 10,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    advancedFilters: {
        marginHorizontal: 24,
        marginBottom: 16,
        padding: 16,
        borderRadius: 14,
        borderWidth: 1,
    },
    advancedTitle: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 12,
    },
    amountRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    amountInput: {
        flex: 1,
        borderRadius: 10,
        borderWidth: 1,
        padding: 12,
    },
    amountLabel: {
        fontSize: 10,
        fontWeight: '600',
        marginBottom: 4,
    },
    amountField: {
        fontSize: 14,
        padding: 0,
    },
    amountSeparator: {
        fontSize: 13,
        fontWeight: '500',
    },
    clearFiltersBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
        paddingVertical: 8,
        borderRadius: 8,
        gap: 6,
    },
    clearFiltersText: {
        fontSize: 12,
        fontWeight: '600',
    },
});
