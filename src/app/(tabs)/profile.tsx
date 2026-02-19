import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Feather, Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING } from '../../constants/theme';
import { useAppStore } from '../../store/appStore';
import { useTheme } from '../../contexts/ThemeContext';

export default function ProfileScreen() {
    const router = useRouter();
    const { userProfile, signOut } = useAppStore();
    const { isDark, toggleTheme, colors } = useTheme();

    const menuItems = [
        { label: 'Business Profile', icon: 'briefcase', route: '/onboarding', available: true },
        { label: 'Payment Details', icon: 'credit-card', route: '/payment-details', available: true },
        { label: 'Product Library', icon: 'package', route: '/(tabs)/products', available: true },
        { label: 'Invoice History', icon: 'file-text', route: '/(tabs)/invoices', available: true },
        { label: 'Notification Settings', icon: 'bell', route: '', available: false },
    ];

    const handleLogout = async () => {
        await signOut();
        router.replace('/login');
    };

    const handleMenuPress = (item: any) => {
        if (item.available && item.route) {
            router.push(item.route as any);
        } else {
            // Coming soon features
            Alert.alert(
                '🚧 Coming Soon',
                `${item.label} will be available in a future update.`,
                [{ text: 'OK' }]
            );
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={isDark ? 'light' : 'dark'} />

            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.background }]}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Account</Text>
            </View>

            <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 120 }}>
                {/* Profile Card */}
                <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[styles.avatar, { backgroundColor: colors.inputBg }]}>
                        <Feather name="user" size={28} color={colors.textSecondary} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.name, { color: colors.text }]}>{userProfile?.businessName || 'Business Name'}</Text>
                        <Text style={styles.plan}>{userProfile?.isPro ? 'Pro Plan' : 'Free Plan'}</Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.editBtn, { backgroundColor: colors.text }]}
                        onPress={() => router.push('/onboarding')}
                    >
                        <Text style={[styles.editBtnText, { color: colors.background }]}>Edit</Text>
                    </TouchableOpacity>
                </View>

                {/* Menu Section */}
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>GENERAL</Text>
                <View style={[styles.menuContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    {menuItems.map((item, index) => (
                        <TouchableOpacity
                            key={index}
                            style={[styles.menuItem, index === menuItems.length - 1 && { borderBottomWidth: 0 }, { borderBottomColor: colors.border }]}
                            onPress={() => handleMenuPress(item)}
                        >
                            <View style={[styles.menuIconBox, { backgroundColor: colors.inputBg }]}>
                                <Feather name={item.icon as any} size={18} color={colors.textSecondary} />
                            </View>
                            <Text style={[styles.menuLabel, { color: colors.text }]}>{item.label}</Text>
                            <Feather name="chevron-right" size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Dark Mode Toggle */}
                <View style={styles.toggleRow}>
                    <View style={[styles.menuIconBox, { backgroundColor: colors.inputBg }]}>
                        <Ionicons name={isDark ? "moon" : "moon-outline"} size={18} color={colors.textSecondary} />
                    </View>
                    <Text style={[styles.menuLabel, { color: colors.text }]}>Dark Mode</Text>
                    <Switch
                        value={isDark}
                        onValueChange={toggleTheme}
                        trackColor={{ true: '#2563EB', false: '#E5E7EB' }}
                    />
                </View>

                {/* Logout */}
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>

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
        paddingBottom: 24,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
    },
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderRadius: 20,
        marginBottom: 32,
        gap: 16,
        borderWidth: 1,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    name: {
        fontSize: 17,
        fontWeight: '600',
    },
    plan: {
        fontSize: 13,
        color: '#2563EB',
        marginTop: 2,
    },
    editBtn: {
        backgroundColor: '#1E1E1E',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    editBtnText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '600',
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 1,
        marginBottom: 12,
    },
    menuContainer: {
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 24,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
    },
    menuIconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    menuLabel: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 32,
        paddingHorizontal: 4,
    },
    logoutBtn: {
        alignItems: 'center',
        padding: 16,
    },
    logoutText: {
        color: '#EF4444',
        fontSize: 15,
        fontWeight: '600',
    },
});
