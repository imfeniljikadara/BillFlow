import { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAppStore } from '../store/appStore';
import { Invoice } from '../types';

interface InvoiceCardProps {
    invoice: Invoice;
    index?: number;
}

export const InvoiceCard = ({ invoice, index = 0 }: InvoiceCardProps) => {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const { duplicateInvoice } = useAppStore();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                delay: index * 100, // Stagger effect
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 500,
                delay: index * 100,
                useNativeDriver: true,
            })
        ]).start();
    }, [index]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PAID': return colors.success;
            case 'OVERDUE': return colors.error;
            default: return colors.warning;
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'PAID': return 'check-circle';
            case 'OVERDUE': return 'alert-circle';
            default: return 'clock';
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short'
        });
    };

    const statusColor = getStatusColor(invoice.status);

    const handleLongPress = () => {
        Alert.alert(
            'Invoice Actions',
            `What would you like to do with this invoice for ${invoice.clientName}?`,
            [
                {
                    text: 'Duplicate Invoice',
                    onPress: async () => {
                        try {
                            await duplicateInvoice(invoice.id);
                            Alert.alert('✓ Success', 'Invoice duplicated successfully!');
                        } catch (e) {
                            Alert.alert('Error', 'Failed to duplicate invoice');
                        }
                    }
                },
                {
                    text: 'View Details',
                    onPress: () => router.push(`/invoice/${invoice.id}`)
                },
                {
                    text: 'Cancel',
                    style: 'cancel'
                }
            ]
        );
    };

    return (
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.push(`/invoice/${invoice.id}`)}
                onLongPress={handleLongPress}
                style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
                <View style={styles.header}>
                    <View style={[styles.iconBox, { backgroundColor: isDark ? colors.inputBg : colors.surface }]}>
                        <Feather name="file-text" size={20} color={colors.primary} />
                    </View>
                    <View style={styles.clientInfo}>
                        <Text style={[styles.clientName, { color: colors.text }]} numberOfLines={1}>
                            {invoice.clientName}
                        </Text>
                        <Text style={[styles.date, { color: colors.textSecondary }]}>
                            {formatDate(invoice.dateCreated)} • #{invoice.id.slice(-6).toUpperCase()}
                        </Text>
                    </View>
                    <View style={styles.amountBox}>
                        <Text style={[styles.amount, { color: colors.text }]}>
                            ₹{invoice.amount.toLocaleString('en-IN')}
                        </Text>
                    </View>
                </View>

                {/* Footer / Status Line */}
                <View style={[styles.footer, { borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : colors.surface }]}>
                    <View style={styles.badgesRow}>
                        <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
                            <Feather name={getStatusIcon(invoice.status) as any} size={12} color={statusColor} />
                            <Text style={[styles.statusText, { color: statusColor }]}>
                                {invoice.status}
                            </Text>
                        </View>
                        {invoice.isRecurring && (
                            <View style={[styles.recurringBadge, { backgroundColor: colors.primary + '15' }]}>
                                <Feather name="repeat" size={11} color={colors.primary} />
                                <Text style={[styles.recurringText, { color: colors.primary }]}>
                                    {invoice.recurrenceInterval?.toUpperCase().slice(0, 3)}
                                </Text>
                            </View>
                        )}
                    </View>
                    <Feather name="chevron-right" size={16} color={colors.textSecondary} />
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 12,
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    clientInfo: {
        flex: 1,
    },
    clientName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    date: {
        fontSize: 12,
    },
    amountBox: {
        alignItems: 'flex-end',
    },
    amount: {
        fontSize: 16,
        fontWeight: '700',
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderTopWidth: 1,
    },
    badgesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        gap: 6,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '600',
    },
    recurringBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 7,
        paddingVertical: 4,
        borderRadius: 6,
        gap: 4,
    },
    recurringText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});
