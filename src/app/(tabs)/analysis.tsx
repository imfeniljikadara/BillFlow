import { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { useAppStore } from '../../store/appStore';
import { useTheme } from '../../contexts/ThemeContext';

const { width } = Dimensions.get('window');

export default function AnalysisScreen() {
    const { invoices } = useAppStore();
    const { isDark, colors } = useTheme();

    // Real Stats Calculations
    const stats = useMemo(() => {
        const totalRaised = invoices.reduce((sum, inv) => sum + inv.amount, 0);
        const totalCollected = invoices.filter(inv => inv.status === 'PAID').reduce((sum, inv) => sum + inv.amount, 0);
        const totalPending = invoices.filter(inv => inv.status === 'PENDING').reduce((sum, inv) => sum + inv.amount, 0);
        const totalOverdue = invoices.filter(inv => inv.status === 'OVERDUE').reduce((sum, inv) => sum + inv.amount, 0);
        
        const progress = totalRaised > 0 ? (totalCollected / totalRaised) : 0;
        const remaining = totalRaised - totalCollected;
        
        // Calculate invoices by status
        const paidCount = invoices.filter(inv => inv.status === 'PAID').length;
        const pendingCount = invoices.filter(inv => inv.status === 'PENDING').length;
        const overdueCount = invoices.filter(inv => inv.status === 'OVERDUE').length;
        
        // Calculate monthly trend (last 6 months)
        const now = new Date();
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthlyData: number[] = [];
        const monthLabels: string[] = [];
        
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            monthLabels.push(monthNames[date.getMonth()]);
            
            const monthTotal = invoices
                .filter(inv => {
                    const invDate = new Date(inv.dateCreated);
                    return invDate.getFullYear() === date.getFullYear() && 
                           invDate.getMonth() === date.getMonth() &&
                           inv.status === 'PAID';
                })
                .reduce((sum, inv) => sum + inv.amount, 0);
            
            monthlyData.push(monthTotal);
        }
        
        return {
            totalRaised,
            totalCollected,
            totalPending,
            totalOverdue,
            progress,
            remaining,
            paidCount,
            pendingCount,
            overdueCount,
            monthlyData,
            monthLabels
        };
    }, [invoices]);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={isDark ? 'light' : 'dark'} />

            {/* Header */}
            <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Analytics</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
                {/* Revenue Card */}
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Total Collected</Text>
                    <Text style={[styles.bigAmount, { color: colors.text }]}>
                        ₹{stats.totalCollected.toLocaleString('en-IN')}
                    </Text>
                    <View style={styles.progressInfo}>
                        <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                            {Math.round(stats.progress * 100)}% of ₹{stats.totalRaised.toLocaleString('en-IN')} invoiced
                        </Text>
                    </View>
                    
                    {/* Progress Bar */}
                    <View style={[styles.progressBar, { backgroundColor: colors.inputBg }]}>
                        <View style={[styles.progressFill, { width: `${Math.min(stats.progress * 100, 100)}%`, backgroundColor: colors.primary }]} />
                    </View>
                </View>

                {/* Monthly Chart */}
                {stats.totalCollected > 0 && (
                    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={[styles.cardTitle, { color: colors.text }]}>Revenue Trend (6 Months)</Text>
                        <LineChart
                            data={{
                                labels: stats.monthLabels,
                                datasets: [{ data: stats.monthlyData.length > 0 ? stats.monthlyData : [0] }]
                            }}
                            width={width - 80}
                            height={180}
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
                            }}
                            bezier
                            style={{ marginTop: 16 }}
                        />
                    </View>
                )}

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={[styles.statIcon, { backgroundColor: '#10B98115' }]}>
                            <Feather name="check-circle" size={20} color="#10B981" />
                        </View>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Paid</Text>
                        <Text style={[styles.statValue, { color: colors.text }]}>{stats.paidCount}</Text>
                        <Text style={[styles.statAmount, { color: '#10B981' }]}>
                            ₹{stats.totalCollected.toLocaleString('en-IN')}
                        </Text>
                    </View>

                    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={[styles.statIcon, { backgroundColor: '#F59E0B15' }]}>
                            <Feather name="clock" size={20} color="#F59E0B" />
                        </View>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending</Text>
                        <Text style={[styles.statValue, { color: colors.text }]}>{stats.pendingCount}</Text>
                        <Text style={[styles.statAmount, { color: '#F59E0B' }]}>
                            ₹{stats.totalPending.toLocaleString('en-IN')}
                        </Text>
                    </View>
                </View>

                <View style={styles.statsGrid}>
                    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={[styles.statIcon, { backgroundColor: '#EF444415' }]}>
                            <Feather name="alert-circle" size={20} color="#EF4444" />
                        </View>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Overdue</Text>
                        <Text style={[styles.statValue, { color: colors.text }]}>{stats.overdueCount}</Text>
                        <Text style={[styles.statAmount, { color: '#EF4444' }]}>
                            ₹{stats.totalOverdue.toLocaleString('en-IN')}
                        </Text>
                    </View>

                    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={[styles.statIcon, { backgroundColor: '#2563EB15' }]}>
                            <Feather name="file-text" size={20} color="#2563EB" />
                        </View>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
                        <Text style={[styles.statValue, { color: colors.text }]}>{invoices.length}</Text>
                        <Text style={[styles.statAmount, { color: colors.textSecondary }]}>
                            ₹{stats.totalRaised.toLocaleString('en-IN')}
                        </Text>
                    </View>
                </View>

                {/* Empty State */}
                {invoices.length === 0 && (
                    <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Feather name="bar-chart-2" size={48} color={colors.textSecondary} />
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>No Data Yet</Text>
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                            Create invoices to see your analytics
                        </Text>
                    </View>
                )}
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
        marginBottom: 24,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
    },
    card: {
        marginHorizontal: 24,
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        marginBottom: 20,
    },
    cardLabel: {
        fontSize: 13,
        marginBottom: 8,
    },
    bigAmount: {
        fontSize: 40,
        fontWeight: '700',
    },
    progressInfo: {
        marginTop: 12,
        marginBottom: 16,
    },
    progressText: {
        fontSize: 14,
    },
    progressBar: {
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: 8,
        borderRadius: 4,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    statsGrid: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        gap: 12,
        marginBottom: 12,
    },
    statCard: {
        flex: 1,
        borderRadius: 20,
        padding: 18,
        borderWidth: 1,
    },
    statIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    statLabel: {
        fontSize: 12,
        marginBottom: 6,
    },
    statValue: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 4,
    },
    statAmount: {
        fontSize: 12,
        fontWeight: '600',
    },
    emptyCard: {
        marginHorizontal: 24,
        borderRadius: 24,
        padding: 40,
        borderWidth: 1,
        alignItems: 'center',
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        textAlign: 'center',
    },
});
