import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, RefreshControl, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { useAppStore } from '../../store/appStore';
import { useTheme } from '../../contexts/ThemeContext';
import { Invoice } from '../../types';
import { InvoiceCard } from '../../components/InvoiceCard';

const { width } = Dimensions.get('window');

type FilterType = 'ALL' | 'PAID' | 'PENDING' | 'OVERDUE' | 'RECURRING';

export default function InvoicesTabScreen() {
    const router = useRouter();
    const { invoices } = useAppStore();
    const { isDark, colors } = useTheme();

    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');
    const [refreshing, setRefreshing] = useState(false);
    const [sortBy, setSortBy] = useState<'date' | 'amount' | 'client'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

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
    }, [invoices, activeFilter, searchQuery, sortBy, sortOrder]);

    // Stats
    const stats = useMemo(() => ({
        all: invoices.length,
        paid: invoices.filter(inv => inv.status === 'PAID').length,
        pending: invoices.filter(inv => inv.status === 'PENDING').length,
        overdue: invoices.filter(inv => inv.status === 'OVERDUE').length,
        recurring: invoices.filter(inv => inv.isRecurring === true).length,
    }), [invoices]);

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
        <InvoiceCard invoice={item} index={index} />
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
                <View>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Invoices</Text>
                    <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                        Manage all your invoices
                    </Text>
                </View>
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
                    placeholder="Search invoices..."
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

            {/* Sort Options */}
            <View style={styles.sortRow}>
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
                        onPress={() => {
                            if (sortBy === option) {
                                setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                            } else {
                                setSortBy(option as any);
                                setSortOrder('desc');
                            }
                        }}
                    >
                        <Text style={[
                            styles.sortOptionText,
                            { color: sortBy === option ? '#FFF' : colors.text }
                        ]}>
                            {option.charAt(0).toUpperCase() + option.slice(1)}
                        </Text>
                        {sortBy === option && (
                            <Feather 
                                name={sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'} 
                                size={12} 
                                color="#FFF" 
                            />
                        )}
                    </TouchableOpacity>
                ))}
            </View>

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
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
    },
    headerSubtitle: {
        fontSize: 14,
        marginTop: 4,
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
        marginBottom: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
    },
    sortRow: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        gap: 8,
        marginBottom: 12,
    },
    sortOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
        gap: 6,
    },
    sortOptionText: {
        fontSize: 13,
        fontWeight: '600',
    },
    filterContainer: {
        marginBottom: 12,
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
        paddingBottom: 120,
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
});
