import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Share, ActivityIndicator, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useAppStore } from '../../store/appStore';
import { useTheme } from '../../contexts/ThemeContext';
import { generateInvoicePDF } from '../../utils/pdfGenerator';

export default function InvoiceDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { invoices, updateInvoiceStatus, deleteInvoice, duplicateInvoice, sendReminder, userProfile } = useAppStore();
    const { isDark, colors } = useTheme();
    const [loading, setLoading] = useState(false);
    const [actionType, setActionType] = useState<string | null>(null);

    const invoice = invoices.find(inv => inv.id === id);

    // Not Found State
    if (!invoice) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <StatusBar style={isDark ? 'light' : 'dark'} />
                <View style={[styles.header, { borderBottomColor: colors.border }]}>
                    <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.inputBg }]}>
                        <Feather name="arrow-left" size={22} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Invoice</Text>
                    <View style={{ width: 44 }} />
                </View>
                <View style={styles.notFound}>
                    <View style={[styles.notFoundIcon, { backgroundColor: colors.inputBg }]}>
                        <Feather name="file-minus" size={48} color={colors.textSecondary} />
                    </View>
                    <Text style={[styles.notFoundTitle, { color: colors.text }]}>Invoice not found</Text>
                    <Text style={[styles.notFoundSubtitle, { color: colors.textSecondary }]}>
                        This invoice may have been deleted or doesn't exist
                    </Text>
                    <TouchableOpacity style={styles.notFoundBtn} onPress={() => router.back()}>
                        <Text style={styles.notFoundBtnText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const handleMarkPaid = () => {
        Alert.alert(
            '✓ Mark as Paid',
            `Confirm that ₹${invoice.amount.toLocaleString()} has been received from ${invoice.clientName}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm Paid',
                    onPress: () => {
                        updateInvoiceStatus(invoice.id, 'PAID');
                        Alert.alert('Success', 'Invoice marked as paid!');
                    }
                }
            ]
        );
    };

    const handleMarkOverdue = () => {
        Alert.alert(
            '⚠️ Mark as Overdue',
            `Mark this invoice from ${invoice.clientName} as overdue?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Mark Overdue',
                    style: 'destructive',
                    onPress: () => {
                        updateInvoiceStatus(invoice.id, 'OVERDUE');
                    }
                }
            ]
        );
    };

    const handleDelete = () => {
        Alert.alert(
            '🗑️ Delete Invoice',
            `Are you sure you want to delete this invoice for ${invoice.clientName}? This action cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await deleteInvoice(invoice.id);
                        router.back();
                    }
                }
            ]
        );
    };

    const handleDuplicate = async () => {
        Alert.alert(
            '📋 Duplicate Invoice',
            `Create a copy of this invoice for ${invoice.clientName}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Duplicate',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            setActionType('duplicate');
                            await duplicateInvoice(invoice.id);
                            Alert.alert('✓ Success', 'Invoice duplicated successfully!', [
                                { text: 'OK', onPress: () => router.back() }
                            ]);
                        } catch (e) {
                            Alert.alert('Error', 'Failed to duplicate invoice. Please try again.');
                        } finally {
                            setLoading(false);
                            setActionType(null);
                        }
                    }
                }
            ]
        );
    };

    const handleShare = async () => {
        setLoading(true);
        setActionType('share');
        try {
            const html = generateInvoicePDF(invoice, userProfile);
            const { uri } = await Print.printToFileAsync({ html, base64: false });

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, {
                    mimeType: 'application/pdf',
                    dialogTitle: `Invoice - ${invoice.clientName}`,
                    UTI: 'com.adobe.pdf'
                });
            } else {
                Alert.alert('Error', 'Sharing is not available on this device');
            }
        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Failed to generate PDF. Please try again.');
        } finally {
            setLoading(false);
            setActionType(null);
        }
    };

    const handlePrint = async () => {
        setLoading(true);
        setActionType('print');
        try {
            const html = generateInvoicePDF(invoice, userProfile);
            await Print.printAsync({ html });
        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Failed to print. Please try again.');
        } finally {
            setLoading(false);
            setActionType(null);
        }
    };

    const handleWhatsApp = () => {
        if (!invoice.clientPhone && !invoice.clientEmail) {
            Alert.alert('No Contact', 'No phone or email available for this client.');
            return;
        }

        const message = `Hi ${invoice.clientName},%0A%0AYour invoice of ₹${invoice.amount.toLocaleString()} is ${invoice.status}.%0A%0AInvoice #: ${invoice.id.slice(-8).toUpperCase()}%0AAmount: ₹${invoice.amount.toLocaleString()}%0A%0AThank you for your business!%0A${userProfile?.businessName || ''}`;

        if (invoice.clientPhone) {
            const phone = invoice.clientPhone.replace(/\D/g, '');
            Linking.openURL(`https://wa.me/${phone}?text=${message}`);
        } else if (invoice.clientEmail) {
            Linking.openURL(`mailto:${invoice.clientEmail}?subject=Invoice from ${userProfile?.businessName || 'Business'}&body=${message.replace(/%0A/g, '\n')}`);
        }
    };

    const handleSendReminder = async () => {
        if (!invoice.clientPhone && !invoice.clientEmail) {
            Alert.alert('No Contact', 'No phone or email available for this client.');
            return;
        }

        Alert.alert(
            '📬 Send Payment Reminder',
            `Send a payment reminder to ${invoice.clientName}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Send',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            setActionType('reminder');

                            // Update reminder count in Firebase
                            await sendReminder(invoice.id);

                            // Send actual message
                            const message = `Hi ${invoice.clientName},%0A%0AReminder: Your invoice of ₹${invoice.amount.toLocaleString()} is ${invoice.status}.%0A%0AInvoice #: ${invoice.id.slice(-8).toUpperCase()}%0ADue: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN') : 'Immediate'}%0A%0APlease make payment at your earliest convenience.%0A%0AThank you!%0A${userProfile?.businessName || ''}`;

                            if (invoice.clientPhone) {
                                const phone = invoice.clientPhone.replace(/\D/g, '');
                                await Linking.openURL(`https://wa.me/${phone}?text=${message}`);
                            } else if (invoice.clientEmail) {
                                await Linking.openURL(`mailto:${invoice.clientEmail}?subject=Payment Reminder - ${userProfile?.businessName || 'Business'}&body=${message.replace(/%0A/g, '\n')}`);
                            }

                            Alert.alert('✓ Success', 'Payment reminder sent successfully!');
                        } catch (e) {
                            Alert.alert('Error', 'Failed to send reminder. Please try again.');
                        } finally {
                            setLoading(false);
                            setActionType(null);
                        }
                    }
                }
            ]
        );
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PAID': return '#10B981';
            case 'OVERDUE': return '#EF4444';
            default: return '#F59E0B';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'PAID': return 'check-circle';
            case 'OVERDUE': return 'alert-circle';
            default: return 'clock';
        }
    };

    const statusColor = getStatusColor(invoice.status);
    const statusIcon = getStatusIcon(invoice.status);

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
    };

    const daysSinceCreated = Math.floor((new Date().getTime() - new Date(invoice.dateCreated).getTime()) / (1000 * 60 * 60 * 24));

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={isDark ? 'light' : 'dark'} />

            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.inputBg }]}>
                    <Feather name="arrow-left" size={22} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Invoice Details</Text>
                <View style={styles.headerActions}>
                    <TouchableOpacity
                        onPress={handleDuplicate}
                        style={[styles.menuBtn, { backgroundColor: colors.inputBg, marginRight: 8 }]}
                        disabled={loading}
                    >
                        {loading && actionType === 'duplicate' ? (
                            <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                            <Feather name="copy" size={18} color={colors.primary} />
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => router.push(`/edit-invoice?id=${invoice.id}`)}
                        style={[styles.menuBtn, { backgroundColor: colors.primary, marginRight: 8 }]}
                    >
                        <Feather name="edit-2" size={18} color="#FFF" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleDelete} style={[styles.menuBtn, { backgroundColor: colors.inputBg }]}>
                        <Feather name="trash-2" size={18} color="#EF4444" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {/* Status Banner */}
                <View style={[styles.statusBanner, { backgroundColor: `${statusColor}15` }]}>
                    <Feather name={statusIcon as any} size={18} color={statusColor} />
                    <View>
                        <Text style={[styles.statusText, { color: statusColor }]}>{invoice.status}</Text>
                        {invoice.status === 'PENDING' && daysSinceCreated > 0 && (
                            <Text style={[styles.statusSubtext, { color: statusColor }]}>
                                Created {daysSinceCreated} day{daysSinceCreated > 1 ? 's' : ''} ago
                            </Text>
                        )}
                    </View>
                    {invoice.status === 'PENDING' && (
                        <TouchableOpacity onPress={handleMarkOverdue} style={styles.overdueBtn}>
                            <Text style={styles.overdueBtnText}>Mark Overdue</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Amount Card */}
                <View style={styles.amountCard}>
                    <Text style={styles.amountLabel}>Total Amount</Text>
                    <Text style={styles.amountValue}>₹{invoice.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
                    <Text style={styles.invoiceNumber}>Invoice #{invoice.id.slice(-8).toUpperCase()}</Text>
                </View>

                {/* Quick Actions */}
                <View style={styles.quickActions}>
                    <TouchableOpacity
                        style={[styles.quickAction, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={handleWhatsApp}
                    >
                        <Feather name="send" size={20} color="#25D366" />
                        <Text style={[styles.quickActionText, { color: colors.text }]}>Send</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.quickAction, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={handleShare}
                        disabled={loading}
                    >
                        {loading && actionType === 'share' ? (
                            <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                            <Feather name="share-2" size={20} color={colors.primary} />
                        )}
                        <Text style={[styles.quickActionText, { color: colors.text }]}>Share</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.quickAction, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={handlePrint}
                        disabled={loading}
                    >
                        {loading && actionType === 'print' ? (
                            <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                            <Feather name="printer" size={20} color={colors.primary} />
                        )}
                        <Text style={[styles.quickActionText, { color: colors.text }]}>Print</Text>
                    </TouchableOpacity>
                    {invoice.status !== 'PAID' && (
                        <TouchableOpacity
                            style={[styles.quickAction, { backgroundColor: colors.card, borderColor: colors.border }]}
                            onPress={handleSendReminder}
                            disabled={loading}
                        >
                            {loading && actionType === 'reminder' ? (
                                <ActivityIndicator size="small" color="#F59E0B" />
                            ) : (
                                <Feather name="bell" size={20} color="#F59E0B" />
                            )}
                            <Text style={[styles.quickActionText, { color: colors.text }]}>Remind</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Reminder History */}
                {invoice.reminderCount && invoice.reminderCount > 0 && (
                    <View style={[styles.reminderHistory, { backgroundColor: isDark ? colors.inputBg : '#FEF3C7', borderColor: '#F59E0B' }]}>
                        <Feather name="bell" size={16} color="#F59E0B" />
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.reminderText, { color: colors.text }]}>
                                {invoice.reminderCount} reminder{invoice.reminderCount > 1 ? 's' : ''} sent
                            </Text>
                            {invoice.lastReminderSent && (
                                <Text style={[styles.reminderSubtext, { color: colors.textSecondary }]}>
                                    Last sent: {new Date(invoice.lastReminderSent).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </Text>
                            )}
                        </View>
                    </View>
                )}

                {/* Client Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>CLIENT</Text>
                    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.clientRow}>
                            <View style={[styles.clientAvatar, { backgroundColor: isDark ? colors.inputBg : '#EFF6FF' }]}>
                                <Text style={[styles.avatarText, { color: colors.primary }]}>
                                    {invoice.clientName.substring(0, 2).toUpperCase()}
                                </Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.clientName, { color: colors.text }]}>{invoice.clientName}</Text>
                                {invoice.clientEmail && (
                                    <Text style={[styles.clientDetail, { color: colors.textSecondary }]}>
                                        ✉️ {invoice.clientEmail}
                                    </Text>
                                )}
                                {invoice.clientPhone && (
                                    <Text style={[styles.clientDetail, { color: colors.textSecondary }]}>
                                        📱 {invoice.clientPhone}
                                    </Text>
                                )}
                            </View>
                        </View>
                    </View>
                </View>

                {/* Items Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>ITEMS ({invoice.items?.length || 0})</Text>
                    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        {invoice.items?.map((item, index) => (
                            <View key={index} style={[styles.itemRow, index > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.itemDesc, { color: colors.text }]}>{item.description}</Text>
                                    <Text style={[styles.itemQty, { color: colors.textSecondary }]}>
                                        {item.quantity} × ₹{item.price.toLocaleString()}
                                    </Text>
                                </View>
                                <Text style={[styles.itemTotal, { color: colors.text }]}>
                                    ₹{(item.quantity * item.price).toLocaleString()}
                                </Text>
                            </View>
                        ))}

                        <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
                            <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Grand Total</Text>
                            <Text style={[styles.totalValue, { color: colors.text }]}>
                                ₹{invoice.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Details Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>DETAILS</Text>
                    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.detailRow}>
                            <Feather name="calendar" size={18} color={colors.textSecondary} />
                            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Created</Text>
                            <Text style={[styles.detailValue, { color: colors.text }]}>
                                {formatDate(invoice.dateCreated)}
                            </Text>
                        </View>
                        {invoice.notes && (
                            <View style={[styles.notesBox, { backgroundColor: colors.inputBg }]}>
                                <Feather name="file-text" size={16} color={colors.textSecondary} />
                                <Text style={[styles.notesText, { color: colors.text }]}>{invoice.notes}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Recurring Invoice Info */}
                {invoice.isRecurring && (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>RECURRING INVOICE</Text>
                        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <View style={styles.detailRow}>
                                <Feather name="repeat" size={18} color={colors.primary} />
                                <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Interval</Text>
                                <Text style={[styles.detailValue, { color: colors.text }]}>
                                    {(invoice.recurrenceInterval || 'monthly').charAt(0).toUpperCase() + (invoice.recurrenceInterval || 'monthly').slice(1)}
                                </Text>
                            </View>
                            {invoice.nextRecurrenceDate && (
                                <View style={[styles.detailRow, { marginTop: 12 }]}>
                                    <Feather name="clock" size={18} color={colors.textSecondary} />
                                    <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Next Invoice</Text>
                                    <Text style={[styles.detailValue, { color: colors.text }]}>
                                        {formatDate(invoice.nextRecurrenceDate)}
                                    </Text>
                                </View>
                            )}
                            <View style={[styles.recurringNotice, { backgroundColor: isDark ? colors.inputBg : '#EFF6FF', marginTop: 14 }]}>
                                <Feather name="info" size={14} color={colors.primary} />
                                <Text style={[styles.recurringNoticeText, { color: colors.textSecondary }]}>
                                    This invoice will be automatically duplicated based on the recurrence interval
                                </Text>
                            </View>
                        </View>
                    </View>
                )}
            </ScrollView>

            {/* Footer Actions */}
            {invoice.status !== 'PAID' && (
                <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
                    <TouchableOpacity style={styles.markPaidBtn} onPress={handleMarkPaid}>
                        <Feather name="check-circle" size={20} color="#FFF" />
                        <Text style={styles.markPaidText}>Mark as Paid</Text>
                    </TouchableOpacity>
                </View>
            )}
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
        borderBottomWidth: 1,
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuBtn: {
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
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    notFound: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
    },
    notFoundIcon: {
        width: 100,
        height: 100,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    notFoundTitle: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 8,
    },
    notFoundSubtitle: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 32,
    },
    notFoundBtn: {
        backgroundColor: '#2563EB',
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 14,
    },
    notFoundBtnText: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '600',
    },
    content: {
        padding: 24,
        paddingBottom: 140,
    },
    statusBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 14,
        marginBottom: 20,
        gap: 12,
    },
    statusText: {
        fontSize: 14,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    statusSubtext: {
        fontSize: 12,
        marginTop: 2,
    },
    overdueBtn: {
        marginLeft: 'auto',
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: 'rgba(0,0,0,0.1)',
        borderRadius: 8,
    },
    overdueBtnText: {
        color: '#EF4444',
        fontSize: 11,
        fontWeight: '600',
    },
    amountCard: {
        backgroundColor: '#2563EB',
        borderRadius: 24,
        padding: 28,
        alignItems: 'center',
        marginBottom: 20,
    },
    amountLabel: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 14,
        marginBottom: 4,
    },
    amountValue: {
        color: '#FFFFFF',
        fontSize: 40,
        fontWeight: '700',
        marginBottom: 8,
    },
    invoiceNumber: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 13,
        fontWeight: '500',
    },
    quickActions: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    quickAction: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 16,
        borderRadius: 16,
        borderWidth: 1,
        gap: 6,
    },
    quickActionText: {
        fontSize: 12,
        fontWeight: '500',
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 10,
        letterSpacing: 0.5,
    },
    card: {
        borderRadius: 18,
        padding: 18,
        borderWidth: 1,
    },
    clientRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    clientAvatar: {
        width: 52,
        height: 52,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 18,
        fontWeight: '600',
    },
    clientName: {
        fontSize: 17,
        fontWeight: '600',
    },
    clientDetail: {
        fontSize: 13,
        marginTop: 4,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
    },
    itemDesc: {
        fontSize: 15,
        fontWeight: '500',
    },
    itemQty: {
        fontSize: 13,
        marginTop: 4,
    },
    itemTotal: {
        fontSize: 16,
        fontWeight: '600',
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: 16,
        marginTop: 8,
        borderTopWidth: 1,
    },
    totalLabel: {
        fontSize: 15,
        fontWeight: '500',
    },
    totalValue: {
        fontSize: 20,
        fontWeight: '700',
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    detailLabel: {
        fontSize: 14,
    },
    detailValue: {
        fontSize: 14,
        fontWeight: '500',
        marginLeft: 'auto',
    },
    notesBox: {
        flexDirection: 'row',
        marginTop: 14,
        padding: 14,
        borderRadius: 12,
        gap: 10,
    },
    notesText: {
        flex: 1,
        fontSize: 14,
        lineHeight: 20,
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
    markPaidBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#10B981',
        paddingVertical: 16,
        borderRadius: 14,
        gap: 10,
    },
    markPaidText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    reminderHistory: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        gap: 12,
    },
    reminderText: {
        fontSize: 14,
        fontWeight: '600',
    },
    reminderSubtext: {
        fontSize: 12,
        marginTop: 2,
    },
    recurringNotice: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 12,
        borderRadius: 10,
        gap: 10,
    },
    recurringNoticeText: {
        fontSize: 12,
        flex: 1,
        lineHeight: 18,
    },
});
