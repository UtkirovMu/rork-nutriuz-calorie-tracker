import React, { useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
  Dimensions,
} from 'react-native';
import { Stack } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Plus, Trash2, Calendar } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import { useLanguage } from '@/contexts/LanguageContext';

const SCREEN_WIDTH = Dimensions.get('window').width;
const PHOTO_SIZE = (SCREEN_WIDTH - 60) / 2;

export default function ProgressPhotosScreen() {
  const { colors } = useTheme();
  const { tr } = useLanguage();
  const { progressPhotos, addProgressPhoto, removeProgressPhoto, unlockAchievement } = useUser();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [fadeAnim]);

  const handleAddPhoto = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(tr('scanner', 'permissionNeeded'), tr('progressPhotos', 'galleryPermission'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        addProgressPhoto(result.assets[0].uri);
        unlockAchievement('photo_first');
      }
    } catch (error) {
      console.log('Error picking image:', error);
      Alert.alert(tr('common', 'error'), tr('progressPhotos', 'pickError'));
    }
  }, [addProgressPhoto, unlockAchievement, tr]);

  const handleTakePhoto = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(tr('scanner', 'permissionNeeded'), tr('progressPhotos', 'cameraPermission'));
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        addProgressPhoto(result.assets[0].uri);
        unlockAchievement('photo_first');
      }
    } catch (error) {
      console.log('Error taking photo:', error);
      Alert.alert(tr('common', 'error'), tr('progressPhotos', 'captureError'));
    }
  }, [addProgressPhoto, unlockAchievement, tr]);

  const handleRemove = useCallback((id: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      tr('progressPhotos', 'deleteConfirmTitle'),
      tr('progressPhotos', 'deleteConfirmMsg'),
      [
        { text: tr('common', 'cancel'), style: 'cancel' },
        { text: tr('common', 'delete'), style: 'destructive', onPress: () => removeProgressPhoto(id) },
      ]
    );
  }, [removeProgressPhoto, tr]);

  const sortedPhotos = useMemo(() => {
    return [...progressPhotos].sort((a, b) => b.timestamp - a.timestamp);
  }, [progressPhotos]);

  const groupedPhotos = useMemo(() => {
    const groups: Record<string, typeof progressPhotos> = {};
    sortedPhotos.forEach(p => {
      if (!groups[p.date]) groups[p.date] = [];
      groups[p.date].push(p);
    });
    return groups;
  }, [sortedPhotos]);

  const ds = useMemo(() => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    emptyContainer: {
      flex: 1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingHorizontal: 32,
      gap: 16,
      paddingBottom: 60,
    },
    emptyIconCircle: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: colors.primaryLight,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    emptyTitle: { fontSize: 22, fontFamily: 'Outfit_700Bold', color: colors.text },
    emptySubtitle: { fontSize: 15, color: colors.textSecondary, textAlign: 'center' as const, lineHeight: 22 },
    addBtnRow: {
      flexDirection: 'row' as const,
      gap: 12,
    },
    addBtn: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 8,
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderRadius: 16,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },
    addBtnSecondary: {
      backgroundColor: colors.surface,
      shadowColor: colors.black,
      shadowOpacity: 0.06,
    },
    addBtnText: { fontSize: 15, fontFamily: 'Outfit_600SemiBold', color: colors.white },
    addBtnTextSecondary: { color: colors.text },
    headerActions: {
      flexDirection: 'row' as const,
      justifyContent: 'flex-end' as const,
      paddingHorizontal: 20,
      paddingVertical: 12,
      gap: 10,
    },
    headerBtn: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: 6,
      backgroundColor: colors.primaryLight,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 12,
    },
    headerBtnText: { fontSize: 13, fontFamily: 'Outfit_600SemiBold', color: colors.primary },
    dateLabel: {
      fontSize: 14,
      fontFamily: 'Outfit_600SemiBold',
      color: colors.textSecondary,
      paddingHorizontal: 20,
      marginTop: 12,
      marginBottom: 8,
    },
    photoGrid: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      paddingHorizontal: 16,
      gap: 10,
    },
    photoCard: {
      width: PHOTO_SIZE,
      height: PHOTO_SIZE * 1.3,
      borderRadius: 16,
      overflow: 'hidden' as const,
      backgroundColor: colors.surfaceSecondary,
    },
    photoImage: {
      width: '100%' as const,
      height: '100%' as const,
    },
    photoOverlay: {
      position: 'absolute' as const,
      bottom: 0,
      left: 0,
      right: 0,
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      alignItems: 'center' as const,
      paddingHorizontal: 10,
      paddingVertical: 8,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    photoDate: { fontSize: 11, color: '#FFFFFF', fontFamily: 'Outfit_500Medium' },
    deleteBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: 'rgba(255,59,48,0.8)',
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    countCard: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 16,
      marginHorizontal: 20,
      marginBottom: 12,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 8,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 1,
    },
    countText: { fontSize: 15, fontFamily: 'Outfit_600SemiBold', color: colors.textSecondary },
    countValue: { fontSize: 18, fontFamily: 'Outfit_800ExtraBold', color: colors.primary },
  }), [colors]);

  if (progressPhotos.length === 0) {
    return (
      <View style={ds.screen}>
        <Stack.Screen options={{ title: tr('nav', 'progressPhotos'), headerBackTitle: tr('nav', 'back') }} />
        <Animated.View style={[ds.emptyContainer, { opacity: fadeAnim }]}>
          <View style={ds.emptyIconCircle}>
            <Camera size={40} color={colors.primary} />
          </View>
          <Text style={ds.emptyTitle}>{tr('progressPhotos', 'title')}</Text>
          <Text style={ds.emptySubtitle}>
            {tr('progressPhotos', 'subtitle')}
          </Text>
          <View style={ds.addBtnRow}>
            <TouchableOpacity style={ds.addBtn} onPress={handleTakePhoto} activeOpacity={0.8}>
              <Camera size={18} color={colors.white} />
              <Text style={ds.addBtnText}>{tr('progressPhotos', 'takePhoto')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[ds.addBtn, ds.addBtnSecondary]} onPress={handleAddPhoto} activeOpacity={0.8}>
              <Plus size={18} color={colors.text} />
              <Text style={[ds.addBtnText, ds.addBtnTextSecondary]}>{tr('progressPhotos', 'fromGallery')}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={ds.screen}>
      <Stack.Screen options={{ title: tr('nav', 'progressPhotos'), headerBackTitle: tr('nav', 'back') }} />
      <Animated.ScrollView style={{ opacity: fadeAnim }} showsVerticalScrollIndicator={false}>
        <View style={ds.headerActions}>
          <TouchableOpacity style={ds.headerBtn} onPress={handleTakePhoto} activeOpacity={0.7}>
            <Camera size={14} color={colors.primary} />
            <Text style={ds.headerBtnText}>{tr('progressPhotos', 'takePhoto')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={ds.headerBtn} onPress={handleAddPhoto} activeOpacity={0.7}>
            <Plus size={14} color={colors.primary} />
            <Text style={ds.headerBtnText}>{tr('progressPhotos', 'fromGallery')}</Text>
          </TouchableOpacity>
        </View>

        <View style={ds.countCard}>
          <Text style={ds.countText}>{tr('progressPhotos', 'totalPhotos')}</Text>
          <Text style={ds.countValue}>{progressPhotos.length}</Text>
        </View>

        {Object.entries(groupedPhotos).map(([date, photos]) => (
          <View key={date}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20 }}>
              <Calendar size={12} color={colors.textSecondary} />
              <Text style={ds.dateLabel}>{date}</Text>
            </View>
            <View style={ds.photoGrid}>
              {photos.map(photo => (
                <View key={photo.id} style={ds.photoCard}>
                  <Image source={{ uri: photo.uri }} style={ds.photoImage} contentFit="cover" />
                  <View style={ds.photoOverlay}>
                    <Text style={ds.photoDate}>{photo.date}</Text>
                    <TouchableOpacity style={ds.deleteBtn} onPress={() => handleRemove(photo.id)}>
                      <Trash2 size={12} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))}

        <View style={{ height: 40 }} />
      </Animated.ScrollView>
    </View>
  );
}
