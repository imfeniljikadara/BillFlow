import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { COLORS, GRADIENTS } from '../constants/theme';
import { useAppStore } from '../store/appStore';

export default function AuthDispatcher() {
    const router = useRouter();
    const { user, userProfile, isLoading } = useAppStore();

    useEffect(() => {
        if (isLoading) return;

        if (!user) {
            // No user, go to login
            router.replace('/login');
        } else if (userProfile?.onboardingComplete) {
            // User has completed onboarding
            router.replace('/(tabs)');
        } else {
            // User exists but hasn't completed onboarding
            router.replace('/onboarding');
        }
    }, [user, userProfile, isLoading]);

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={GRADIENTS.dark}
                style={StyleSheet.absoluteFill}
            />
            <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
