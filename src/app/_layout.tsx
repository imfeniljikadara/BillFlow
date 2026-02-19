import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text } from 'react-native';
import { useAppStore } from '../store/appStore';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';

function RootLayoutInner() {
    const { initialize, isOffline, lastError } = useAppStore();
    const { isDark, colors } = useTheme();

    useEffect(() => {
        const unsub = initialize();
        return () => unsub();
    }, []);

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            
            {/* Offline Indicator */}
            {isOffline && (
                <View style={{ backgroundColor: '#F97316', paddingHorizontal: 12, paddingVertical: 8 }}>
                    <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600', textAlign: 'center' }}>
                        📶 Offline Mode - Changes will sync when connected
                    </Text>
                </View>
            )}

            {/* Error Banner */}
            {lastError && !isOffline && (
                <View style={{ backgroundColor: '#EF4444', paddingHorizontal: 12, paddingVertical: 8 }}>
                    <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600', textAlign: 'center' }}>
                        ⚠️ {lastError}
                    </Text>
                </View>
            )}

            <Stack
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: colors.background },
                    animation: 'slide_from_right',
                }}
            >
                <Stack.Screen name="index" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="login" />
                <Stack.Screen name="onboarding" />
                <Stack.Screen name="create" />
                <Stack.Screen name="edit-invoice" />
                <Stack.Screen name="invoices" />
                <Stack.Screen name="payment-details" />
                <Stack.Screen name="invoice/[id]" />
                <Stack.Screen name="clients" />
            </Stack>
        </View>
    );
}

export default function RootLayout() {
    return (
        <ThemeProvider>
            <RootLayoutInner />
        </ThemeProvider>
    );
}
