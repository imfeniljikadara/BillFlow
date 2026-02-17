import { Tabs } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

export default function TabLayout() {
    const { isDark, colors } = useTheme();

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: colors.card,
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                    height: 85,
                    paddingTop: 12,
                    paddingBottom: 28,
                },
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textSecondary,
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '500',
                    marginTop: 4,
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color, focused }) => (
                        <Feather name="home" size={22} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="products"
                options={{
                    title: 'Merchants',
                    tabBarIcon: ({ color, focused }) => (
                        <Feather name="shopping-bag" size={22} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="analysis"
                options={{
                    title: 'Banking',
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name="business-outline" size={22} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Account',
                    tabBarIcon: ({ color, focused }) => (
                        <Feather name="user" size={22} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
