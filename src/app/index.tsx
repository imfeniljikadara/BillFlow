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

        if (user) {
            // User is logged in
            if (userProfile?.onboardingComplete) {
                router.replace('/(tabs)');
            } else if (userProfile) { // Profile exists but flag missing check
                if (userProfile.onboardingComplete) router.replace('/(tabs)');
                else router.replace('/onboarding');
            } else {
                // No profile yet, go to onboarding to set name
                router.replace('/onboarding');
            }
        } else {
            // No user, go to login
            router.replace('/login');
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
