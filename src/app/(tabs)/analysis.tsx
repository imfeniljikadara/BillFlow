import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAppStore } from '../../store/appStore';
import { useTheme } from '../../contexts/ThemeContext';

const { width } = Dimensions.get('window');

export default function AnalyticsScreen() {
    const router = useRouter();
    const { invoices, clients } = useAppStore();
    const { isDark, colors } = useTheme();
    const [refreshing, setRefreshing] = useState(false);

    // Comprehensive Analytics
    const analytics = useMemo(() => {
        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();
        const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
        const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

        // Basic Stats
        const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.amount, 0);
        const totalCollected = invoices.filter(inv => inv.status === 'PAID').reduce((sum, inv) => sum + inv.amount, 0);
        const totalPending = invoices.filter(inv => inv.status === 'PENDING').reduce((sum, inv) => sum + inv.amount, 0);
        const totalOverdue = invoices.filter(inv => inv.status === 'OVERDUE').reduce((sum, inv) => sum + inv.amount, 0);

        // This Month
        const thisMonthInvoices = invoices.filter(inv => {
            const d = new Date(inv.dateCreated);
            return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
        });
        const thisMonthTotal = thisMonthInvoices.reduce((sum, inv) => sum + inv.amount, 0);
        const thisMonthCollected = thisMonthInvoices.filter(inv => inv.status === 'PAID').reduce((sum, inv) => sum + inv.amount, 0);

        // Last Month
        const lastMonthInvoices = invoices.filter(inv => {
            const d = new Date(inv.dateCreated);
            return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
        });
        const lastMonthTotal = lastMonthInvoices.reduce((sum, inv) => sum + inv.amount, 0);

        // Growth
        const growth = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal * 100) : 0;

        // Collection Rate
        const collectionRate = totalInvoiced > 0 ? (totalCollected / totalInvoiced * 100) : 0;

        // Average Invoice
        const avgInvoice = invoices.length > 0 ? totalInvoiced / invoices.length : 0;

        // Counts
        const paidCount = invoices.filter(inv => inv.status === 'PAID').length;
        const pendingCount = invoices.filter(inv => inv.status === 'PENDING').length;
        const overdueCount = invoices.filter(inv => inv.status === 'OVERDUE').length;
        const recurringCount = invoices.filter(inv => inv.isRecurring).length;

        // Top Clients
        const clientTotals: { [key: string]: number } = {};
        invoices.forEach(inv => {
            clientTotals[inv.clientName] = (clientTotals[inv.clientName] || 0) + inv.amount;
        });
        const topClients = Object.entries(clientTotals)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, amount]) => ({ name, amount }));

        // Monthly data for last 6 months
        const monthlyData: { month: string; amount: number }[] = [];
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(thisYear, thisMonth - i, 1);
            const m = d.getMonth();
            const y = d.getFullYear();
            const monthTotal = invoices
                .filter(inv => {
                    const invDate = new Date(inv.dateCreated);
                    return invDate.getMonth() === m && invDate.getFullYear() === y;
                })
                .reduce((sum, inv) => sum + inv.amount, 0);
            monthlyData.push({ month: monthNames[m], amount: monthTotal });
        }

        const maxMonthlyAmount = Math.max(...monthlyData.map(d => d.amount), 1);

        return {
            totalInvoiced,
            totalCollected,
            totalPending,
            totalOverdue,
            thisMonthTotal,
            thisMonthCollected,
            lastMonthTotal,
            growth,
            collectionRate,
            avgInvoice,
            paidCount,
            pendingCount,
            overdueCount,
            recurringCount,
            topClients,
            monthlyData,
            maxMonthlyAmount,
            totalInvoices: invoices.length,
            totalClients: clients.length,
        };
    }, [invoices, clients]);

    const onRefresh = () => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 1000);
    };

    const formatCurrency = (amount: number) => {
        if (amount >= 100000) {
            return `₹${(amount / 100000).toFixed(1)}L`;
        } else if (amount >= 1000) {
            return `₹${(amount / 1000).toFixed(1)}K`;
        }
        return `₹${amount.toLocaleString('en-IN')}`;
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={isDark ? 'light' : 'dark'} />

            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Analytics</Text>
                    <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Your business insights</Text>
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 120 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                }
            >
                {/* Main Revenue Card */}
                <View style={[styles.revenueCard, { backgroundColor: '#2563EB' }]}>
                    <View style={styles.revenueHeader}>
                        <Text style={styles.revenueLabel}>Total Revenue</Text>
                        <View style={[styles.growthBadge, { backgroundColor: analytics.growth >= 0 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)' }]}>
                            <Feather name={analytics.growth >= 0 ? 'trending-up' : 'trending-down'} size={12} color={analytics.growth >= 0 ? '#10B981' : '#EF4444'} />
                            <Text style={[styles.growthText, { color: analytics.growth >= 0 ? '#10B981' : '#EF4444' }]}>
                                {analytics.growth >= 0 ? '+' : ''}{analytics.growth.toFixed(1)}%
                            </Text>
                        </View>
                    </View>
                    <Text style={styles.revenueAmount}>₹{analytics.totalCollected.toLocaleString('en-IN')}</Text>
                    <Text style={styles.revenueSubtext}>of ₹{analytics.totalInvoiced.toLocaleString('en-IN')} invoiced</Text>
                    
                    {/* Progress Bar */}
                    <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                            <View style={[styles.progressFill, { width: `${Math.min(analytics.collectionRate, 100)}%` }]} />
                        </View>
                        <Text style={styles.progressText}>{analytics.collectionRate.toFixed(0)}% collected</Text>
                    </View>
                </View>

                {/* Quick Stats Grid */}
                <View style={styles.statsGrid}>
                    <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={[styles.statIconBox, { backgroundColor: '#10B98115' }]}>
                            <Feather name="check-circle" size={20} color="#10B981" />
                        </View>
                        <Text style={[styles.statBoxValue, { color: colors.text }]}>{analytics.paidCount}</Text>
                        <Text style={[styles.statBoxLabel, { color: colors.textSecondary }]}>Paid</Text>
                        <Text style={[styles.statBoxAmount, { color: '#10B981' }]}>{formatCurrency(analytics.totalCollected)}</Text>
                    </View>
                    <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={[styles.statIconBox, { backgroundColor: '#F59E0B15' }]}>
                            <Feather name="clock" size={20} color="#F59E0B" />
                        </View>
                        <Text style={[styles.statBoxValue, { color: colors.text }]}>{analytics.pendingCount}</Text>
                        <Text style={[styles.statBoxLabel, { color: colors.textSecondary }]}>Pending</Text>
                        <Text style={[styles.statBoxAmount, { color: '#F59E0B' }]}>{formatCurrency(analytics.totalPending)}</Text>
                    </View>
                    <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={[styles.statIconBox, { backgroundColor: '#EF444415' }]}>
                            <Feather name="alert-circle" size={20} color="#EF4444" />
                        </View>
                        <Text style={[styles.statBoxValue, { color: colors.text }]}>{analytics.overdueCount}</Text>
                        <Text style={[styles.statBoxLabel, { color: colors.textSecondary }]}>Overdue</Text>
                        <Text style={[styles.statBoxAmount, { color: '#EF4444' }]}>{formatCurrency(analytics.totalOverdue)}</Text>
                    </View>
                    <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={[styles.statIconBox, { backgroundColor: '#8B5CF615' }]}>
                            <Feather name="repeat" size={20} color="#8B5CF6" />
                        </View>
                        <Text style={[styles.statBoxValue, { color: colors.text }]}>{analytics.recurringCount}</Text>
                        <Text style={[styles.statBoxLabel, { color: colors.textSecondary }]}>Recurring</Text>
                        <Text style={[styles.statBoxAmount, { color: '#8B5CF6' }]}>Active</Text>
                    </View>
                </View>

                {/* Monthly Chart */}
                <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.chartTitle, { color: colors.text }]}>Monthly Overview</Text>
                    <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>Last 6 months revenue</Text>
                    
                    <View style={styles.barChart}>
                        {analytics.monthlyData.map((data, index) => (
                            <View key={index} style={styles.barContainer}>
                                <View style={styles.barWrapper}>
                                    <View 
                                        style={[
                                            styles.bar, 
                                            { 
                                                height: `${(data.amount / analytics.maxMonthlyAmount) * 100}%`,
                                                backgroundColor: index === 5 ? colors.primary : `${colors.primary}40`,
                                            }
                                        ]} 
                                    />
                                </View>
                                <Text style={[styles.barLabel, { color: colors.textSecondary }]}>{data.month}</Text>
                                <Text style={[styles.barValue, { color: colors.text }]}>
                                    {data.amount >= 1000 ? `${(data.amount / 1000).toFixed(0)}K` : data.amount}
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Key Metrics */}
                <View style={[styles.metricsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.chartTitle, { color: colors.text }]}>Key Metrics</Text>
                    
                    <View style={styles.metricRow}>
                        <View style={styles.metricLeft}>
                            <Feather name="file-text" size={18} color={colors.primary} />
                            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Average Invoice</Text>
                        </View>
                        <Text style={[styles.metricValue, { color: colors.text }]}>₹{analytics.avgInvoice.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
                    </View>
                    
                    <View style={[styles.metricRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16 }]}>
                        <View style={styles.metricLeft}>
                            <Feather name="calendar" size={18} color={colors.primary} />
                            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>This Month</Text>
                        </View>
                        <Text style={[styles.metricValue, { color: colors.text }]}>₹{analytics.thisMonthTotal.toLocaleString('en-IN')}</Text>
                    </View>
                    
                    <View style={[styles.metricRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16 }]}>
                        <View style={styles.metricLeft}>
                            <Feather name="users" size={18} color={colors.primary} />
                            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Total Clients</Text>
                        </View>
                        <Text style={[styles.metricValue, { color: colors.text }]}>{analytics.totalClients}</Text>
                    </View>
                    
                    <View style={[styles.metricRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 16 }]}>
                        <View style={styles.metricLeft}>
                            <Feather name="percent" size={18} color={colors.primary} />
                            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Collection Rate</Text>
                        </View>
                        <Text style={[styles.metricValue, { color: analytics.collectionRate >= 70 ? '#10B981' : '#F59E0B' }]}>
                            {analytics.collectionRate.toFixed(1)}%
                        </Text>
                    </View>
                </View>

                {/* Top Clients */}
                {analytics.topClients.length > 0 && (
                    <View style={[styles.clientsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.clientsHeader}>
                            <Text style={[styles.chartTitle, { color: colors.text }]}>Top Clients</Text>
                            <TouchableOpacity onPress={() => router.push('/clients')}>
                                <Text style={[styles.seeAllText, { color: colors.primary }]}>See all</Text>
                            </TouchableOpacity>
                        </View>
                        
                        {analytics.topClients.map((client, index) => (
                            <View key={client.name} style={[styles.clientRow, index > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
                                <View style={[styles.clientRank, { backgroundColor: index === 0 ? '#F59E0B15' : colors.inputBg }]}>
                                    <Text style={[styles.clientRankText, { color: index === 0 ? '#F59E0B' : colors.textSecondary }]}>#{index + 1}</Text>
                                </View>
                                <Text style={[styles.clientName, { color: colors.text }]} numberOfLines={1}>{client.name}</Text>
                                <Text style={[styles.clientAmount, { color: colors.text }]}>{formatCurrency(client.amount)}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Empty State */}
                {invoices.length === 0 && (
                    <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={[styles.emptyIconBox, { backgroundColor: isDark ? colors.inputBg : '#EFF6FF' }]}>
                            <Feather name="bar-chart-2" size={40} color={colors.primary} />
                        </View>
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>No data yet</Text>
                        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                            Create invoices to see your business analytics
                        </Text>
                        <TouchableOpacity style={styles.emptyButton} onPress={() => router.push('/create')}>
                            <Feather name="plus" size={18} color="#FFF" />
                            <Text style={styles.emptyButtonText}>Create Invoice</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
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
    revenueCard: {
        marginHorizontal: 24,
        borderRadius: 24,
        padding: 24,
        marginBottom: 20,
    },
    revenueHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    revenueLabel: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.7)',
    },
    growthBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        gap: 4,
    },
    growthText: {
        fontSize: 12,
        fontWeight: '700',
    },
    revenueAmount: {
        fontSize: 36,
        fontWeight: '700',
        color: '#FFF',
    },
    revenueSubtext: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.6)',
        marginTop: 4,
    },
    progressContainer: {
        marginTop: 20,
    },
    progressBar: {
        height: 8,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#FFF',
        borderRadius: 4,
    },
    progressText: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 8,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 24,
        gap: 12,
        marginBottom: 20,
    },
    statBox: {
        width: (width - 60) / 2,
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
    },
    statIconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    statBoxValue: {
        fontSize: 28,
        fontWeight: '700',
    },
    statBoxLabel: {
        fontSize: 13,
        marginTop: 4,
    },
    statBoxAmount: {
        fontSize: 14,
        fontWeight: '600',
        marginTop: 6,
    },
    chartCard: {
        marginHorizontal: 24,
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        marginBottom: 20,
    },
    chartTitle: {
        fontSize: 17,
        fontWeight: '600',
    },
    chartSubtitle: {
        fontSize: 13,
        marginTop: 4,
        marginBottom: 20,
    },
    barChart: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        height: 140,
    },
    barContainer: {
        flex: 1,
        alignItems: 'center',
    },
    barWrapper: {
        width: 32,
        height: 100,
        justifyContent: 'flex-end',
    },
    bar: {
        width: '100%',
        borderRadius: 6,
        minHeight: 4,
    },
    barLabel: {
        fontSize: 11,
        marginTop: 8,
    },
    barValue: {
        fontSize: 10,
        fontWeight: '600',
        marginTop: 2,
    },
    metricsCard: {
        marginHorizontal: 24,
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        marginBottom: 20,
    },
    metricRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 16,
    },
    metricLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    metricLabel: {
        fontSize: 14,
    },
    metricValue: {
        fontSize: 16,
        fontWeight: '700',
    },
    clientsCard: {
        marginHorizontal: 24,
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        marginBottom: 20,
    },
    clientsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    seeAllText: {
        fontSize: 14,
        fontWeight: '600',
    },
    clientRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
    },
    clientRank: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    clientRankText: {
        fontSize: 12,
        fontWeight: '700',
    },
    clientName: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
    },
    clientAmount: {
        fontSize: 15,
        fontWeight: '700',
    },
    emptyCard: {
        marginHorizontal: 24,
        borderRadius: 20,
        padding: 40,
        borderWidth: 1,
        alignItems: 'center',
    },
    emptyIconBox: {
        width: 80,
        height: 80,
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
        color: '#FFF',
        fontSize: 15,
        fontWeight: '600',
    },
});
