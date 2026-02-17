import { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, Modal, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { useAppStore } from '../../store/appStore';
import { useTheme } from '../../contexts/ThemeContext';

const { width } = Dimensions.get('window');

export default function ProductsScreen() {
    const { products, addProduct, deleteProduct } = useAppStore();
    const { isDark, colors } = useTheme();

    const [isModalVisible, setModalVisible] = useState(false);
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');

    const handleAddProduct = async () => {
        if (!name || !price) {
            Alert.alert('Error', 'Please enter Name and Price');
            return;
        }

        await addProduct({
            name,
            price: parseFloat(price),
        });

        setName('');
        setPrice('');
        setModalVisible(false);
    };

    const handleDelete = (id: string) => {
        Alert.alert('Delete Product', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteProduct(id) }
        ]);
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={isDark ? 'light' : 'dark'} />

            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Products Library</Text>
                    <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Save items to reuse in invoices</Text>
                </View>
            </View>

            {/* Stats Cards */}
            <View style={styles.statsRow}>
                <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[styles.statIcon, { backgroundColor: '#2563EB15' }]}>
                        <Feather name="package" size={20} color="#2563EB" />
                    </View>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Items</Text>
                    <Text style={[styles.statValue, { color: colors.text }]}>{products.length}</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[styles.statIcon, { backgroundColor: '#10B98115' }]}>
                        <Feather name="trending-up" size={20} color="#10B981" />
                    </View>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Avg. Price</Text>
                    <Text style={[styles.statValue, { color: colors.text }]}>₹{products.length > 0 ? Math.round(products.reduce((sum, p) => sum + p.price, 0) / products.length) : 0}</Text>
                </View>
            </View>

            {/* Product List Header */}
            <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Products</Text>
            </View>

            {/* Product List */}
            <FlatList
                data={products}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <View style={[styles.emptyIcon, { backgroundColor: colors.inputBg }]}>
                            <Feather name="package" size={40} color={colors.textSecondary} />
                        </View>
                        <Text style={[styles.emptyText, { color: colors.text }]}>No products yet</Text>
                        <Text style={[styles.emptySubText, { color: colors.textSecondary }]}>Add services or products to quickly add them to invoices</Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <TouchableOpacity 
                        style={[styles.productItem, { backgroundColor: colors.card, borderColor: colors.border }]} 
                        onLongPress={() => handleDelete(item.id)}
                    >
                        <View style={[styles.productIcon, { backgroundColor: colors.inputBg }]}>
                            <Feather name="box" size={20} color={colors.primary} />
                        </View>
                        <View style={styles.productInfo}>
                            <Text style={[styles.productName, { color: colors.text }]}>{item.name}</Text>
                            <Text style={[styles.productPrice, { color: colors.textSecondary }]}>₹{item.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
                        </View>
                        <TouchableOpacity 
                            style={[styles.deleteBtn, { backgroundColor: colors.inputBg }]}
                            onPress={() => handleDelete(item.id)}
                        >
                            <Feather name="trash-2" size={16} color="#EF4444" />
                        </TouchableOpacity>
                    </TouchableOpacity>
                )}
            />

            {/* Floating Add Button */}
            <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
                <Feather name="plus" size={24} color="#FFF" />
            </TouchableOpacity>

            {/* Add Product Modal */}
            <Modal
                visible={isModalVisible}
                transparent={true}
                animationType="slide"
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>New Item</Text>

                        <Text style={[styles.label, { color: colors.textSecondary }]}>Item Name</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                            placeholder="e.g. Hosting Plan"
                            placeholderTextColor={colors.textSecondary}
                            value={name}
                            onChangeText={setName}
                        />

                        <Text style={[styles.label, { color: colors.textSecondary }]}>Price (₹)</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                            placeholder="0"
                            placeholderTextColor={colors.textSecondary}
                            keyboardType="numeric"
                            value={price}
                            onChangeText={setPrice}
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalBtn, { backgroundColor: colors.inputBg }]}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.modalBtn, { backgroundColor: '#2563EB' }]}
                                onPress={handleAddProduct}
                            >
                                <Text style={[styles.modalBtnText, { color: '#FFF' }]}>Save Item</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
        paddingBottom: 20,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
    },
    headerSubtitle: {
        fontSize: 14,
        marginTop: 4,
    },
    statsRow: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        gap: 12,
        marginBottom: 24,
    },
    statCard: {
        flex: 1,
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
    },
    statIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    statLabel: {
        fontSize: 12,
        marginBottom: 6,
    },
    statValue: {
        fontSize: 24,
        fontWeight: '700',
    },
    sectionHeader: {
        paddingHorizontal: 24,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    listContent: {
        paddingHorizontal: 24,
        paddingBottom: 120,
    },
    productItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 10,
        borderWidth: 1,
    },
    productIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    productInfo: {
        flex: 1,
        marginLeft: 14,
    },
    productName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    productPrice: {
        fontSize: 14,
    },
    deleteBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyContainer: {
        marginTop: 60,
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
    },
    emptySubText: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 22,
    },
    fab: {
        position: 'absolute',
        bottom: 110,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#2563EB',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 24,
        textAlign: 'center',
    },
    label: {
        fontSize: 12,
        marginBottom: 8,
        fontWeight: '600',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    input: {
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        marginBottom: 16,
        borderWidth: 1,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    modalBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    modalBtnText: {
        fontSize: 16,
        fontWeight: '600',
    }
});
