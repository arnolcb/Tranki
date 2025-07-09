// src/components/AvatarPicker.js - Componente para foto de perfil
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { COLORS, Theme } from '../constants/colors';
import CustomIcons from './CustomIcons';
import ImageService from '../services/imageService';

const AvatarPicker = ({ 
  user, 
  onImageUpdate, 
  size = 120, 
  editable = true,
  showName = true 
}) => {
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleImagePicker = async () => {
    if (!editable || uploading) return;

    try {
      setUploading(true);

      // Usar el servicio de imágenes
      const result = await ImageService.updateProfilePicture(
        user.id, 
        user.profilePicture?.publicId
      );

      if (result) {
        // Notificar al componente padre del cambio
        onImageUpdate?.(result);
        
        Alert.alert(
          '✅ Foto actualizada',
          'Tu foto de perfil se ha actualizado correctamente',
          [{ text: 'Genial' }]
        );
      }
    } catch (error) {
      console.error('Error actualizando foto:', error);
      Alert.alert(
        '❌ Error',
        `No se pudo actualizar la foto: ${error.message}`,
        [{ text: 'Entendido' }]
      );
    } finally {
      setUploading(false);
    }
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const getAvatarContent = () => {
    // Si está subiendo, mostrar loading
    if (uploading) {
      return (
        <View style={[styles.avatarContainer, { width: size, height: size }]}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.uploadingText}>Subiendo...</Text>
        </View>
      );
    }

    // Si tiene imagen y no hay error
    if (user?.profilePicture?.url && !imageError) {
      return (
        <Image
          source={{ uri: user.profilePicture.url }}
          style={[styles.avatarImage, { width: size, height: size }]}
          onError={handleImageError}
          resizeMode="cover"
        />
      );
    }

    // Fallback: Avatar con iniciales
    const avatarData = ImageService.getAvatarUrl(user);
    
    if (avatarData.type === 'initials') {
      return (
        <View style={[
          styles.initialsAvatar, 
          { 
            width: size, 
            height: size,
            backgroundColor: avatarData.backgroundColor || COLORS.primary
          }
        ]}>
          <Text style={[
            styles.initialsText,
            { fontSize: size * 0.4 }
          ]}>
            {avatarData.initials}
          </Text>
        </View>
      );
    }

    // Fallback final: icono de usuario
    return (
      <View style={[
        styles.defaultAvatar, 
        { width: size, height: size }
      ]}>
        <CustomIcons.User size={size * 0.5} color={COLORS.white} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.avatarWrapper, { opacity: uploading ? 0.7 : 1 }]}
        onPress={handleImagePicker}
        disabled={!editable || uploading}
        activeOpacity={0.8}
      >
        {getAvatarContent()}
        
        {/* Overlay de edición */}
        {editable && (
          <View style={styles.editOverlay}>
            <View style={styles.editIcon}>
              <CustomIcons.Camera size={16} color={COLORS.white} />
            </View>
          </View>
        )}
        
        {/* Badge de estado online (opcional) */}
        {user?.isOnline && (
          <View style={styles.onlineBadge} />
        )}
      </TouchableOpacity>
      
      {/* Nombre del usuario */}
      {showName && (
        <View style={styles.nameContainer}>
          <Text style={styles.userName} numberOfLines={1}>
            {user?.name || 'Usuario'}
          </Text>
          {user?.role && (
            <Text style={styles.userRole}>
              {user.role === 'ambos' ? 'Estudiante y Trabajador' : 
               user.role === 'estudiante' ? 'Estudiante' : 'Trabajador'}
            </Text>
          )}
        </View>
      )}
      
      {/* Indicador de verificación (futuro) */}
      {user?.isVerified && (
        <View style={styles.verifiedBadge}>
          <CustomIcons.Check size={12} color={COLORS.white} />
        </View>
      )}
    </View>
  );
};

// Componente más pequeño para listas
export const AvatarSmall = ({ user, size = 40, onPress }) => (
  <TouchableOpacity
    style={styles.smallAvatarContainer}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <AvatarPicker 
      user={user} 
      size={size} 
      editable={false} 
      showName={false} 
    />
    {user?.isOnline && (
      <View style={[styles.onlineBadge, styles.smallOnlineBadge]} />
    )}
  </TouchableOpacity>
);

// Componente para preview en pantalla completa
export const AvatarPreview = ({ user, onClose, onEdit }) => (
  <View style={styles.previewContainer}>
    <TouchableOpacity style={styles.previewOverlay} onPress={onClose}>
      <View style={styles.previewContent}>
        <AvatarPicker 
          user={user} 
          size={200} 
          editable={false} 
          showName={false} 
        />
        <Text style={styles.previewName}>{user?.name || 'Usuario'}</Text>
        
        <View style={styles.previewActions}>
          <TouchableOpacity style={styles.previewButton} onPress={onEdit}>
            <CustomIcons.Camera size={16} color={COLORS.white} />
            <Text style={styles.previewButtonText}>Cambiar foto</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.previewButton, styles.previewButtonSecondary]} 
            onPress={onClose}
          >
            <Text style={styles.previewButtonTextSecondary}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  
  // Avatar principal
  avatarWrapper: {
    position: 'relative',
  },
  avatarContainer: {
    borderRadius: 999,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.white,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  avatarImage: {
    borderRadius: 999,
    borderWidth: 3,
    borderColor: COLORS.white,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  
  // Avatar con iniciales
  initialsAvatar: {
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.white,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  initialsText: {
    color: COLORS.white,
    fontWeight: '700',
    letterSpacing: 1,
  },
  
  // Avatar por defecto
  defaultAvatar: {
    borderRadius: 999,
    backgroundColor: COLORS.gray300,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  
  // Overlay de edición
  editOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  editIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Badge online
  onlineBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.success,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  
  // Información del usuario
  nameContainer: {
    marginTop: Theme.spacing.md,
    alignItems: 'center',
  },
  userName: {
    fontSize: Theme.typography.h4,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: Theme.spacing.xs,
  },
  userRole: {
    fontSize: Theme.typography.caption,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  
  // Badge verificado
  verifiedBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  
  // Estado de subida
  uploadingText: {
    fontSize: Theme.typography.small,
    color: COLORS.textSecondary,
    marginTop: Theme.spacing.sm,
    fontWeight: '500',
  },
  
  // Avatar pequeño para listas
  smallAvatarContainer: {
    position: 'relative',
  },
  smallOnlineBadge: {
    width: 12,
    height: 12,
    borderRadius: 6,
    top: 2,
    right: 2,
  },
  
  // Preview en pantalla completa
  previewContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  previewOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.xl,
  },
  previewContent: {
    alignItems: 'center',
  },
  previewName: {
    fontSize: Theme.typography.h2,
    fontWeight: '700',
    color: COLORS.white,
    marginTop: Theme.spacing.xl,
    marginBottom: Theme.spacing.xxxl,
    textAlign: 'center',
  },
  previewActions: {
    flexDirection: 'row',
    gap: Theme.spacing.lg,
  },
  previewButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: Theme.spacing.xl,
    paddingVertical: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.medium,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.white,
  },
  previewButtonText: {
    color: COLORS.white,
    fontSize: Theme.typography.body,
    fontWeight: '600',
  },
  previewButtonTextSecondary: {
    color: COLORS.white,
    fontSize: Theme.typography.body,
    fontWeight: '600',
  },
});

export default AvatarPicker;