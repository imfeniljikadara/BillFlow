import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAppStore } from '../store/appStore';

export default function LoginScreen() {
    const router = useRouter();
    const { signIn, signUp } = useAppStore();

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
            } else {
                await signUp(email, password);
                Alert.alert('Success', 'Account created! Welcome.');
            }
            router.replace('/(tabs)');
        } catch (e: any) {
            let msg = e.message;
            if (e.code === 'auth/email-already-in-use') msg = 'Email already in use.';
            if (e.code === 'auth/invalid-email') msg = 'Invalid email address.';
            if (e.code === 'auth/user-not-found') msg = 'User not found.';
            if (e.code === 'auth/wrong-password') msg = 'Incorrect password.';

            Alert.alert('Authentication Failed', msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.logoCircle}>
                        <Feather name="file-text" size={32} color="#2563EB" />
                    </View>
                    <Text style={styles.title}>
                        {isLogin ? 'Welcome Back' : 'Create Account'}
                    </Text>
                    <Text style={styles.subtitle}>
                        {isLogin ? 'Sign in to access your invoices' : 'Get started with professional invoicing'}
                    </Text>
                </View>

                {/* Form */}
                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>EMAIL</Text>
                        <View style={styles.inputWrapper}>
                            <Feather name="mail" size={18} color="#9CA3AF" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="you@business.com"
                                placeholderTextColor="#9CA3AF"
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>PASSWORD</Text>
                        <View style={styles.inputWrapper}>
                            <Feather name="lock" size={18} color="#9CA3AF" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="••••••••"
                                placeholderTextColor="#9CA3AF"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                                <Feather name={showPassword ? "eye" : "eye-off"} size={18} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {isLogin && (
                        <TouchableOpacity style={styles.forgotBtn}>
                            <Text style={styles.forgotText}>Forgot Password?</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={styles.authButton}
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
                    <Text style={styles.switchText}>
                        {isLogin ? "Don't have an account? " : "Already have an account? "}
                        <Text style={styles.switchTextBold}>{isLogin ? 'Sign Up' : 'Sign In'}</Text>
                    </Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
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
        backgroundColor: '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        color: '#1E1E1E',
        fontWeight: '700',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        color: '#6B7280',
        fontWeight: '400',
    },
    form: {
        marginBottom: 24,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        color: '#6B7280',
        fontSize: 12,
        marginBottom: 8,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 14,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        paddingVertical: 16,
        color: '#1E1E1E',
        fontSize: 15,
    },
    forgotBtn: {
        alignSelf: 'flex-end',
        marginBottom: 24,
    },
    forgotText: {
        color: '#2563EB',
        fontSize: 13,
        fontWeight: '500',
    },
    authButton: {
        backgroundColor: '#2563EB',
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
    },
    authButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 24,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#E5E7EB',
    },
    dividerText: {
        color: '#9CA3AF',
        fontSize: 12,
        fontWeight: '500',
        paddingHorizontal: 16,
    },
    socialButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 14,
        paddingVertical: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        gap: 10,
    },
    socialButtonText: {
        color: '#1E1E1E',
        fontSize: 15,
        fontWeight: '600',
    },
    switchButton: {
        alignItems: 'center',
    },
    switchText: {
        color: '#6B7280',
        fontSize: 14,
    },
    switchTextBold: {
        color: '#2563EB',
        fontWeight: '600',
    },
});
