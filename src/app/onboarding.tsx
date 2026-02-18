import { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Dimensions, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAppStore } from '../store/appStore';
import { auth, db } from '../config/firebase';
import { doc, setDoc } from 'firebase/firestore';

const { width } = Dimensions.get('window');

const SLIDES = [
    {
        id: 'welcome',
        title: 'Professional Invoices',
        subtitle: 'Create beautiful, branded invoices in seconds.',
        icon: 'file-text',
        color: '#2563EB'
    },
    {
        id: 'track',
        title: 'Track Payments',
        subtitle: 'Monitor pending payments and get notified instantly.',
        icon: 'trending-up',
        color: '#10B981'
    },
    {
        id: 'setup',
        title: 'Setup Your Business',
        subtitle: 'Enter your business name to get started. You can add payment details later.',
        icon: 'briefcase',
        color: '#8B5CF6'
    }
];

export default function OnboardingScreen() {
    const router = useRouter();
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);
    const { user, userProfile } = useAppStore();

    // Form State — pre-fill from existing profile if available
    const [businessName, setBusinessName] = useState('');
    const [upiId, setUpiId] = useState('');
    const [loading, setLoading] = useState(false);

    // Pre-fill from existing profile data (prevents re-entry for returning users)
    useEffect(() => {
        if (userProfile) {
            if (userProfile.businessName) setBusinessName(userProfile.businessName);
            if (userProfile.upiId) setUpiId(userProfile.upiId);
        }
    }, [userProfile]);

    const handleNext = () => {
        if (currentIndex < SLIDES.length - 1) {
            flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
        } else {
            handleFinish();
        }
    };

    const handleFinish = async () => {
        if (!businessName.trim()) {
            Alert.alert('Required', 'Please enter your Business Name to continue.');
            return;
        }

        setLoading(true);
        try {
            const currentUser = auth.currentUser;
            if (currentUser) {
                const profileData: any = {
                    businessName: businessName.trim(),
                    onboardingComplete: true,
                    updatedAt: new Date().toISOString(),
                };
                // Only set UPI ID if provided
                if (upiId.trim()) {
                    profileData.upiId = upiId.trim();
                }
                await setDoc(doc(db, 'users', currentUser.uid), profileData, { merge: true });
            }

            router.replace('/(tabs)');
        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Save failed. Please check your internet connection and try again.');
        } finally {
            setLoading(false);
        }
    };

    const renderSlide = ({ item, index }: { item: typeof SLIDES[0], index: number }) => {
        if (item.id === 'setup') {
            return (
                <View style={[styles.slide, { width }]}>
                    <View style={[styles.iconCircle, { backgroundColor: `${item.color}15` }]}>
                        <Feather name={item.icon as any} size={40} color={item.color} />
                    </View>
                    <Text style={styles.slideTitle}>{item.title}</Text>
                    <Text style={styles.slideSubtitle}>{item.subtitle}</Text>

                    <View style={styles.form}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>BUSINESS NAME *</Text>
                            <View style={styles.inputWrapper}>
                                <Feather name="briefcase" size={18} color="#9CA3AF" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Your Business Name"
                                    placeholderTextColor="#9CA3AF"
                                    value={businessName}
                                    onChangeText={setBusinessName}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>UPI ID (Optional)</Text>
                            <View style={styles.inputWrapper}>
                                <Feather name="at-sign" size={18} color="#9CA3AF" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="yourname@upi"
                                    placeholderTextColor="#9CA3AF"
                                    value={upiId}
                                    onChangeText={setUpiId}
                                    autoCapitalize="none"
                                />
                            </View>
                            <Text style={styles.helperText}>
                                You can add or update this later in Payment Details
                            </Text>
                        </View>
                    </View>
                </View>
            );
        }

        return (
            <View style={[styles.slide, { width }]}>
                <View style={[styles.iconCircle, { backgroundColor: `${item.color}15` }]}>
                    <Feather name={item.icon as any} size={40} color={item.color} />
                </View>
                <Text style={styles.slideTitle}>{item.title}</Text>
                <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
            </View>
        );
    };

    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems.length > 0) {
            setCurrentIndex(viewableItems[0].index);
        }
    }).current;

    return (
        <View style={styles.container}>
            {/* Skip Button */}
            {currentIndex < SLIDES.length - 1 && (
                <TouchableOpacity
                    style={styles.skipBtn}
                    onPress={() => flatListRef.current?.scrollToIndex({ index: SLIDES.length - 1 })}
                >
                    <Text style={styles.skipText}>Skip</Text>
                </TouchableOpacity>
            )}

            {/* Slides */}
            <FlatList
                ref={flatListRef}
                data={SLIDES}
                renderItem={renderSlide}
                keyExtractor={(item) => item.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
            />

            {/* Footer */}
            <View style={styles.footer}>
                {/* Dots */}
                <View style={styles.dots}>
                    {SLIDES.map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.dot,
                                index === currentIndex && styles.activeDot
                            ]}
                        />
                    ))}
                </View>

                {/* Next Button */}
                <TouchableOpacity
                    style={styles.nextBtn}
                    onPress={handleNext}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <>
                            <Text style={styles.nextText}>
                                {currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
                            </Text>
                            <Feather name="arrow-right" size={18} color="#FFF" />
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    skipBtn: {
        position: 'absolute',
        top: 60,
        right: 24,
        zIndex: 10,
    },
    skipText: {
        color: '#6B7280',
        fontSize: 15,
        fontWeight: '500',
    },
    slide: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
    },
    iconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
    },
    slideTitle: {
        fontSize: 28,
        color: '#1E1E1E',
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 12,
    },
    slideSubtitle: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 24,
    },
    form: {
        width: '100%',
        marginTop: 32,
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
    helperText: {
        color: '#9CA3AF',
        fontSize: 12,
        marginTop: 6,
        fontStyle: 'italic',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 14,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        gap: 12,
    },
    input: {
        flex: 1,
        paddingVertical: 16,
        color: '#1E1E1E',
        fontSize: 15,
    },
    footer: {
        paddingHorizontal: 24,
        paddingBottom: 48,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dots: {
        flexDirection: 'row',
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#E5E7EB',
    },
    activeDot: {
        backgroundColor: '#2563EB',
        width: 24,
    },
    nextBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2563EB',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 14,
        gap: 8,
    },
    nextText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
});
