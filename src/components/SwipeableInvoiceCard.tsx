import React, { useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    PanResponder,
    GestureResponderEvent,
    Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Invoice } from '../types';

const { width } = Dimensions.get('window');
const SWIPE_THRESHOLD = 80;

interface SwipeableInvoiceCardProps {
    invoice: Invoice;
    colors: any;
    isDark: boolean;
    onPressCard: () => void;
    onDelete: () => void;
    onMarkPaid: () => void;
    children: React.ReactNode;
}

export const SwipeableInvoiceCard = ({
    invoice,
    colors,
    isDark,
    onPressCard,
    onDelete,
    onMarkPaid,
    children,
}: SwipeableInvoiceCardProps) => {
    const panX = useRef(new Animated.Value(0)).current;
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return Math.abs(gestureState.dx) > 10;
            },
            onPanResponderMove: (event, gestureState) => {
                // Constrain swipe to -SWIPE_THRESHOLD to SWIPE_THRESHOLD
                const newValue = Math.max(-SWIPE_THRESHOLD, Math.min(SWIPE_THRESHOLD, gestureState.dx));
                panX.setValue(newValue);
            },
            onPanResponderRelease: (event, gestureState) => {
                const { dx } = gestureState;
                let targetValue = 0;

                // Swipe left (negative) - show delete button
                if (dx < -SWIPE_THRESHOLD / 2) {
                    targetValue = -SWIPE_THRESHOLD;
                }
                // Swipe right (positive) - show paid button
                else if (dx > SWIPE_THRESHOLD / 2) {
                    targetValue = SWIPE_THRESHOLD;
                }

                Animated.spring(panX, {
                    toValue: targetValue,
                    useNativeDriver: false,
                    speed: 20,
                }).start();
            },
        })
    ).current;

    const handleDeletePress = () => {
        onDelete();
        Animated.spring(panX, {
            toValue: 0,
            useNativeDriver: false,
        }).start();
    };

    const handleMarkPaidPress = () => {
        onMarkPaid();
        Animated.spring(panX, {
            toValue: 0,
            useNativeDriver: false,
        }).start();
    };

    return (
        <View style={styles.container}>
            {/* Background Actions */}
            <View style={[styles.actions, { backgroundColor: colors.card }]}>
                {/* Mark Paid - Right Action */}
                <TouchableOpacity
                    style={[styles.actionRight, { backgroundColor: '#10B981' }]}
                    onPress={handleMarkPaidPress}
                    activeOpacity={0.8}
                >
                    <Feather name="check" size={20} color="#FFF" />
                    <Text style={styles.actionText}>Paid</Text>
                </TouchableOpacity>

                {/* Delete - Left Action */}
                <TouchableOpacity
                    style={[styles.actionLeft, { backgroundColor: '#EF4444' }]}
                    onPress={handleDeletePress}
                    activeOpacity={0.8}
                >
                    <Feather name="trash-2" size={20} color="#FFF" />
                    <Text style={styles.actionText}>Delete</Text>
                </TouchableOpacity>
            </View>

            {/* Main Card */}
            <Animated.View
                style={[
                    styles.card,
                    { backgroundColor: colors.card },
                    {
                        transform: [{ translateX: panX }],
                    },
                ]}
                {...panResponder.panHandlers}
            >
                <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={onPressCard}
                    style={{ flex: 1 }}
                >
                    {children}
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 12,
        borderRadius: 16,
        overflow: 'hidden',
    },
    actions: {
        flexDirection: 'row',
        position: 'absolute',
        width: '100%',
        height: '100%',
        borderRadius: 16,
    },
    actionLeft: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    actionRight: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    actionText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '600',
        marginTop: 4,
    },
    card: {
        borderRadius: 16,
        overflow: 'hidden',
        zIndex: 10,
    },
});
