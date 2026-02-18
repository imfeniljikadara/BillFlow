import { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LineChart } from 'react-native-chart-kit';
import { Feather } from '@expo/vector-icons';
import { useAppStore } from '../../store/appStore';
import { useTheme } from '../../contexts/ThemeContext';
import { InvoiceCard } from '../../components/InvoiceCard';

const { width } = Dimensions.get('window');
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function HomeScreen() {
    const router = useRouter();
    const { invoices, userProfile, refreshData } = useAppStore();
    const { isDark, colors } = useTheme();
    const [refreshing, setRefreshing] = useState(false);

    // Get greeting based on time
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    const firstName = userProfile?.businessName?.split(' ')[0] || 'there';

    // Calculate Stats
    const totalCollected = invoices
        .filter(inv => inv.status === 'PAID')
        .reduce((sum, inv) => sum + inv.amount, 0);

    const pendingAmount = invoices
        .filter(inv => inv.status === 'PENDING')
        .reduce((sum, inv) => sum + inv.amount, 0);

    const totalAmount = totalCollected + pendingAmount;

    // Recent Invoices (last 5)
    const recentInvoices = [...invoices]
        .sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime())
        .slice(0, 5);

    // Calculate real monthly data for chart
    const chartData = useMemo(() => {
        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();

        // Get last 4 months of data
        const monthlyData: { label: string; amount: number }[] = [];
        for (let i = 3; i >= 0; i--) {
            const d = new Date(thisYear, thisMonth - i, 1);
            const m = d.getMonth();
            const y = d.getFullYear();
            const monthTotal = invoices
                .filter(inv => {
                    const invDate = new Date(inv.dateCreated);
                    return invDate.getMonth() === m && invDate.getFullYear() === y;
                })
                .reduce((sum, inv) => sum + inv.amount, 0);
            monthlyData.push({ label: monthNames[m], amount: monthTotal });
        }

        // Ensure we have valid data (at least some non-zero value or minimum for chart)
        const amounts = monthlyData.map(d => d.amount);
        const hasData = amounts.some(a => a > 0);

        return {
            labels: monthlyData.map(d => d.label),
            datasets: [{
                data: hasData ? amounts : [0, 0, 0, 0],
                color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
                strokeWidth: 2
            }]
        };
    }, [invoices]);

    // Calculate month-over-month growth
    const growth = useMemo(() => {
        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();
        const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
        const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

        const thisMonthTotal = invoices
            .filter(inv => {
                const d = new Date(inv.dateCreated);
                return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
            })
            .reduce((sum, inv) => sum + inv.amount, 0);

        const lastMonthTotal = invoices
            .filter(inv => {
                const d = new Date(inv.dateCreated);
                return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
            })
            .reduce((sum, inv) => sum + inv.amount, 0);

        if (lastMonthTotal === 0) return thisMonthTotal > 0 ? 100 : 0;
        return ((thisMonthTotal - lastMonthTotal) / lastMonthTotal * 100);
    }, [invoices]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await refreshData();
        setRefreshing(false);
    }, [refreshData]);

    // getStatusColor replaced by InvoiceCard internal logic

    // formatDate helper replaced by InvoiceCard internal logic

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={isDark ? 'light' : 'dark'} />

            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={[styles.greeting, { color: colors.textSecondary }]}>{getGreeting()},</Text>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>{firstName} 👋</Text>
                </View>
                <View style={styles.headerButtons}>
                    <TouchableOpacity
                        style={[styles.headerBtn, { backgroundColor: colors.primary }]}
                        onPress={() => router.push('/create')}
                    >
                        <Feather name="plus" size={20} color="#FFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.headerBtn, { backgroundColor: colors.text, marginLeft: 12 }]}
                        onPress={() => router.push('/(tabs)/invoices')}
                    >
                        <Feather name="file-text" size={20} color={colors.background} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                }
            >
                {/* Quick Stats Cards */}
                <View style={styles.quickStats}>
                    <TouchableOpacity style={[styles.quickStatCard, { backgroundColor: '#2563EB' }]}>
                        <Feather name="arrow-up-right" size={20} color="rgba(255,255,255,0.7)" />
                        <Text style={styles.quickStatLabel}>Collected</Text>
                        <Text style={styles.quickStatValue}>₹{totalCollected.toLocaleString('en-IN')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.quickStatCard, { backgroundColor: '#F59E0B' }]}>
                        <Feather name="clock" size={20} color="rgba(255,255,255,0.7)" />
                        <Text style={styles.quickStatLabel}>Pending</Text>
                        <Text style={styles.quickStatValue}>₹{pendingAmount.toLocaleString('en-IN')}</Text>
                    </TouchableOpacity>
                </View>

                {/* Main Chart Card */}
                {invoices.length > 0 && (
                    <View style={[styles.mainCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.cardHeader}>
                            <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Total Revenue</Text>
                            <View style={[styles.trendBadge, { backgroundColor: growth >= 0 ? '#10B98115' : '#EF444415' }]}>
                                <Feather name={growth >= 0 ? 'trending-up' : 'trending-down'} size={12} color={growth >= 0 ? '#10B981' : '#EF4444'} />
                                <Text style={[styles.trendText, { color: growth >= 0 ? '#10B981' : '#EF4444' }]}>
                                    {growth >= 0 ? '+' : ''}{growth.toFixed(0)}%
                                </Text>
                            </View>
                        </View>
                        <Text style={[styles.bigAmount, { color: colors.text }]}>₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>

                        <LineChart
                            data={chartData}
                            width={width - 80}
                            height={140}
                            withInnerLines={false}
                            withOuterLines={false}
                            withVerticalLines={false}
                            withHorizontalLines={false}
                            withDots={true}
                            withShadow={false}
                            chartConfig={{
                                backgroundColor: colors.card,
                                backgroundGradientFrom: colors.card,
                                backgroundGradientTo: colors.card,
                                decimalPlaces: 0,
                                color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
                                labelColor: () => colors.textSecondary,
                                propsForDots: {
                                    r: "4",
                                    strokeWidth: "2",
                                    stroke: "#2563EB"
                                },
                                propsForLabels: {
                                    fontSize: 11,
                                }
                            }}
                            bezier
                            style={{ marginTop: 8, marginLeft: -16 }}
                        />
                    </View>
                )}

                {/* Recent Invoices */}
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Invoices</Text>
                    {invoices.length > 0 && (
                        <TouchableOpacity onPress={() => router.push('/(tabs)/invoices')}>
                            <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Empty State */}
                {invoices.length === 0 ? (
                    <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={[styles.emptyIconBox, { backgroundColor: isDark ? colors.inputBg : '#EFF6FF' }]}>
                            <Feather name="file-plus" size={32} color={colors.primary} />
                        </View>
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>No invoices yet</Text>
                        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                            Create your first invoice and start tracking your payments
                        </Text>
                        <TouchableOpacity
                            style={styles.emptyButton}
                            onPress={() => router.push('/create')}
                        >
                            <Feather name="plus" size={18} color="#FFF" />
                            <Text style={styles.emptyButtonText}>Create Invoice</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.invoicesList}>
                        {recentInvoices.map((invoice, index) => (
                            <InvoiceCard key={invoice.id} invoice={invoice} index={index} />
                        ))}
                    </View>
                )}

                {/* Quick Actions */}
                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
                </View>

                <View style={styles.actionsGrid}>
                    <TouchableOpacity
                        style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={() => router.push('/create')}
                    >
                        <View style={[styles.actionIcon, { backgroundColor: '#EFF6FF' }]}>
                            <Feather name="file-plus" size={22} color="#2563EB" />
                        </View>
                        <Text style={[styles.actionLabel, { color: colors.text }]}>New Invoice</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={() => router.push('/payment-details')}
                    >
                        <View style={[styles.actionIcon, { backgroundColor: '#F0FDF4' }]}>
                            <Feather name="credit-card" size={22} color="#10B981" />
                        </View>
                        <Text style={[styles.actionLabel, { color: colors.text }]}>Payment QR</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={() => router.push('/(tabs)/products')}
                    >
                        <View style={[styles.actionIcon, { backgroundColor: '#FEF3C7' }]}>
                            <Feather name="package" size={22} color="#F59E0B" />
                        </View>
                        <Text style={[styles.actionLabel, { color: colors.text }]}>Products</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={() => router.push('/(tabs)/profile')}
                    >
                        <View style={[styles.actionIcon, { backgroundColor: '#FCE7F3' }]}>
                            <Feather name="settings" size={22} color="#EC4899" />
                        </View>
                        <Text style={[styles.actionLabel, { color: colors.text }]}>Settings</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 60,
    },
    header: {
        paddingHorizontal: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    greeting: {
        fontSize: 14,
        marginBottom: 2,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
    },
    headerButtons: {
        flexDirection: 'row',
    },
    headerBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quickStats: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        gap: 12,
        marginBottom: 20,
    },
    quickStatCard: {
        flex: 1,
        borderRadius: 18,
        padding: 18,
    },
    quickStatLabel: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
        marginTop: 8,
        fontWeight: '500',
    },
    quickStatValue: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '700',
        marginTop: 4,
    },
    mainCard: {
        marginHorizontal: 24,
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        marginBottom: 24,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardLabel: {
        fontSize: 13,
        fontWeight: '500',
    },
    trendBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    trendText: {
        fontSize: 12,
        color: '#10B981',
        fontWeight: '600',
    },
    bigAmount: {
        fontSize: 32,
        fontWeight: '700',
        marginTop: 8,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    seeAll: {
        fontSize: 14,
        fontWeight: '500',
    },
    emptyCard: {
        marginHorizontal: 24,
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        borderWidth: 1,
        marginBottom: 24,
    },
    emptyIconBox: {
        width: 72,
        height: 72,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
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
    invoicesList: {
        paddingHorizontal: 24,
        marginBottom: 24,
    },

    actionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 24,
        gap: 12,
    },
    actionCard: {
        width: (width - 60) / 2,
        borderRadius: 18,
        padding: 18,
        borderWidth: 1,
    },
    actionIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    actionLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
});
