import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useAppStore } from '../store/appStore';
import { useTheme } from '../contexts/ThemeContext';

export default function LoginScreen() {
    const router = useRouter();
    const { signIn, signUp } = useAppStore();
    const { isDark, colors } = useTheme();

    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleAuth = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter email and password');
            return;
        }

        setLoading(true);
        try {
            if (isLogin) {
                await signIn(email, password);
                // index.tsx dispatcher will route to /(tabs) once profile loads
                router.replace('/');
            } else {
                await signUp(email, password);
                // New users must complete onboarding — let the dispatcher decide
                router.replace('/');
            }
        } catch (e: any) {
            let msg = e.message;
            if (e.code === 'auth/email-already-in-use') msg = 'Email already in use.';
            if (e.code === 'auth/invalid-email') msg = 'Invalid email address.';
            if (e.code === 'auth/user-not-found') msg = 'User not found.';
            if (e.code === 'auth/wrong-password') msg = 'Incorrect password.';
            if (e.code === 'auth/invalid-credential') msg = 'Invalid email or password.';
            if (e.code === 'auth/weak-password') msg = 'Password must be at least 6 characters.';

            Alert.alert('Authentication Failed', msg);
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!email.trim()) {
            Alert.alert('Enter Email', 'Please enter your email address first, then tap Forgot Password.');
            return;
        }
        try {
            await sendPasswordResetEmail(auth, email.trim());
            Alert.alert('Email Sent', `A password reset link has been sent to ${email.trim()}.`);
        } catch (e: any) {
            let msg = 'Failed to send reset email.';
            if (e.code === 'auth/user-not-found') msg = 'No account found with this email.';
            if (e.code === 'auth/invalid-email') msg = 'Invalid email address.';
            Alert.alert('Error', msg);
        }
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={[styles.logoCircle, { backgroundColor: isDark ? colors.inputBg : '#EFF6FF' }]}>
                        <Feather name="file-text" size={32} color={colors.primary} />
                    </View>
                    <Text style={[styles.title, { color: colors.text }]}>
                        {isLogin ? 'Welcome Back' : 'Create Account'}
                    </Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        {isLogin ? 'Sign in to access your invoices' : 'Get started with professional invoicing'}
                    </Text>
                </View>

                {/* Form */}
                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>EMAIL</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                            <Feather name="mail" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                placeholder="you@business.com"
                                placeholderTextColor={colors.textSecondary}
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>PASSWORD</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                            <Feather name="lock" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                placeholder="••••••••"
                                placeholderTextColor={colors.textSecondary}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                <Feather name={showPassword ? 'eye' : 'eye-off'} size={18} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {isLogin && (
                        <TouchableOpacity style={styles.forgotBtn} onPress={handleForgotPassword}>
                            <Text style={[styles.forgotText, { color: colors.primary }]}>Forgot Password?</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={[styles.authButton, { backgroundColor: colors.primary }]}
                        onPress={handleAuth}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text style={styles.authButtonText}>
                                {isLogin ? 'Sign In' : 'Create Account'}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Switch */}
                <TouchableOpacity
                    style={styles.switchButton}
                    onPress={() => setIsLogin(!isLogin)}
                >
                    <Text style={[styles.switchText, { color: colors.textSecondary }]}>
                        {isLogin ? "Don't have an account? " : 'Already have an account? '}
                        <Text style={[styles.switchTextBold, { color: colors.primary }]}>
                            {isLogin ? 'Sign Up' : 'Sign In'}
                        </Text>
                    </Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logoCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        fontWeight: '400',
    },
    form: {
        marginBottom: 24,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 12,
        marginBottom: 8,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        paddingHorizontal: 16,
        borderWidth: 1,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        paddingVertical: 16,
        fontSize: 15,
    },
    forgotBtn: {
        alignSelf: 'flex-end',
        marginBottom: 24,
    },
    forgotText: {
        fontSize: 13,
        fontWeight: '500',
    },
    authButton: {
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
    },
    authButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    switchButton: {
        alignItems: 'center',
    },
    switchText: {
        fontSize: 14,
    },
    switchTextBold: {
        fontWeight: '600',
    },
});
