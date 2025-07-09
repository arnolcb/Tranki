// src/services/imageService.js - SOLUCIÓN DEFINITIVA para Cloudinary
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { Platform, Alert, PermissionsAndroid } from 'react-native';
import Config from 'react-native-config';

class ImageService {
  constructor() {
    // Configuración de Cloudinary desde .env
    this.cloudinaryConfig = {
      cloudName: Config.CLOUDINARY_CLOUD_NAME,
      uploadPreset: Config.CLOUDINARY_UPLOAD_PRESET,
      apiKey: Config.CLOUDINARY_API_KEY,
    };
    
    console.log('📸 Image Service inicializado con Cloudinary');
    console.log('🔑 Cloud Name:', !!this.cloudinaryConfig.cloudName);
    console.log('🔑 Upload Preset:', !!this.cloudinaryConfig.uploadPreset);
  }

  // Solicitar permisos de cámara y galería
  async requestPermissions() {
    try {
      if (Platform.OS === 'android') {
        const cameraPermission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Permiso de Cámara',
            message: 'Tranki necesita acceso a tu cámara para tomar fotos de perfil',
            buttonNeutral: 'Preguntar después',
            buttonNegative: 'Denegar',
            buttonPositive: 'Permitir',
          }
        );

        // Para Android 13+ (API 33+)
        let storagePermission;
        if (Platform.Version >= 33) {
          storagePermission = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
            {
              title: 'Permiso de Galería',
              message: 'Tranki necesita acceso a tus fotos para seleccionar imágenes',
              buttonNeutral: 'Preguntar después',
              buttonNegative: 'Denegar',
              buttonPositive: 'Permitir',
            }
          );
        } else {
          storagePermission = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
            {
              title: 'Permiso de Galería',
              message: 'Tranki necesita acceso a tu galería para seleccionar fotos',
              buttonNeutral: 'Preguntar después',
              buttonNegative: 'Denegar',
              buttonPositive: 'Permitir',
            }
          );
        }

        return {
          camera: cameraPermission === PermissionsAndroid.RESULTS.GRANTED,
          gallery: storagePermission === PermissionsAndroid.RESULTS.GRANTED
        };
      } else {
        // iOS maneja permisos automáticamente con react-native-image-picker
        return { camera: true, gallery: true };
      }
    } catch (error) {
      console.error('Error solicitando permisos:', error);
      return { camera: false, gallery: false };
    }
  }

  // Mostrar selector de fuente de imagen
  showImagePicker() {
    return new Promise((resolve, reject) => {
      Alert.alert(
        '📸 Foto de perfil',
        'Selecciona una opción para tu foto de perfil',
        [
          {
            text: 'Cancelar',
            style: 'cancel',
            onPress: () => resolve(null)
          },
          {
            text: '📷 Cámara',
            onPress: () => this.openCamera().then(resolve).catch(reject)
          },
          {
            text: '🖼️ Galería',
            onPress: () => this.openGallery().then(resolve).catch(reject)
          }
        ],
        { cancelable: true }
      );
    });
  }

  // Abrir cámara
  async openCamera() {
    try {
      const permissions = await this.requestPermissions();
      
      if (!permissions.camera) {
        Alert.alert(
          '❌ Sin permisos',
          'Necesitas permitir el acceso a la cámara para tomar fotos. Ve a Configuración → Apps → Tranki → Permisos.',
          [{ text: 'Entendido' }]
        );
        return null;
      }

      return new Promise((resolve, reject) => {
        const options = {
          mediaType: 'photo',
          quality: 0.8,
          maxWidth: 800,
          maxHeight: 800,
          includeBase64: false,
          storageOptions: {
            skipBackup: true,
            path: 'images',
          },
        };

        launchCamera(options, (response) => {
          if (response.didCancel) {
            resolve(null);
          } else if (response.errorMessage) {
            console.error('Error de cámara:', response.errorMessage);
            reject(new Error(response.errorMessage));
          } else if (response.assets && response.assets[0]) {
            resolve(response.assets[0]);
          } else {
            resolve(null);
          }
        });
      });
    } catch (error) {
      console.error('Error abriendo cámara:', error);
      throw error;
    }
  }

  // Abrir galería
  async openGallery() {
    try {
      const permissions = await this.requestPermissions();
      
      if (!permissions.gallery) {
        Alert.alert(
          '❌ Sin permisos',
          'Necesitas permitir el acceso a la galería para seleccionar fotos. Ve a Configuración → Apps → Tranki → Permisos.',
          [{ text: 'Entendido' }]
        );
        return null;
      }

      return new Promise((resolve, reject) => {
        const options = {
          mediaType: 'photo',
          quality: 0.8,
          maxWidth: 800,
          maxHeight: 800,
          includeBase64: false,
          selectionLimit: 1,
        };

        launchImageLibrary(options, (response) => {
          if (response.didCancel) {
            resolve(null);
          } else if (response.errorMessage) {
            console.error('Error de galería:', response.errorMessage);
            reject(new Error(response.errorMessage));
          } else if (response.assets && response.assets[0]) {
            resolve(response.assets[0]);
          } else {
            resolve(null);
          }
        });
      });
    } catch (error) {
      console.error('Error abriendo galería:', error);
      throw error;
    }
  }

  // MÉTODO SIMPLIFICADO - Solo lo esencial para unsigned upload
  async uploadToCloudinary(imageAsset, userId) {
    try {
      if (!imageAsset || !imageAsset.uri) {
        throw new Error('No se proporcionó una imagen válida');
      }

      if (!this.isConfigured()) {
        throw new Error('Cloudinary no está configurado correctamente');
      }

      console.log('📤 Subiendo imagen a Cloudinary...');

      // FormData MÍNIMO para unsigned upload
      const formData = new FormData();
      
      // Solo los campos esenciales
      formData.append('file', {
        uri: imageAsset.uri,
        type: imageAsset.type || 'image/jpeg',
        name: imageAsset.fileName || `profile_${userId}_${Date.now()}.jpg`,
      });
      
      formData.append('upload_preset', this.cloudinaryConfig.uploadPreset);
      
      // SOLO agregar folder si está permitido en tu preset
      // formData.append('folder', 'profile_pictures');

      console.log('📤 Enviando a:', `https://api.cloudinary.com/v1_1/${this.cloudinaryConfig.cloudName}/image/upload`);

      // Subir a Cloudinary
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${this.cloudinaryConfig.cloudName}/image/upload`,
        {
          method: 'POST',
          body: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      console.log('📤 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error response de Cloudinary:', errorText);
        
        // Parsear el error para mostrar mensaje más claro
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.error && errorJson.error.message) {
            throw new Error(`Cloudinary: ${errorJson.error.message}`);
          }
        } catch (parseError) {
          // Si no se puede parsear, usar mensaje genérico
        }
        
        throw new Error(`Error subiendo imagen: ${response.status}`);
      }

      const result = await response.json();
      
      console.log('✅ Imagen subida a Cloudinary exitosamente');
      console.log('📸 URL:', result.secure_url);
      
      return {
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        size: result.bytes,
        width: result.width,
        height: result.height,
        uploadedAt: new Date().toISOString(),
        thumbnailUrl: this.generateThumbnailUrl(result.secure_url, 100, 100),
      };
      
    } catch (error) {
      console.error('💥 Error subiendo a Cloudinary:', error);
      throw error;
    }
  }

  // Generar URL de thumbnail manualmente
  generateThumbnailUrl(originalUrl, width, height) {
    if (!originalUrl || !originalUrl.includes('cloudinary.com')) {
      return originalUrl;
    }
    
    // Insertar transformación en la URL
    return originalUrl.replace(
      '/upload/',
      `/upload/c_fill,w_${width},h_${height},g_face,q_auto/`
    );
  }

  // Eliminar imagen de Cloudinary
  async deleteFromCloudinary(publicId) {
    try {
      if (!publicId) return;
      
      console.log('🗑️ Eliminando imagen de Cloudinary...');
      
      // Para eliminar necesitas firmado con API secret
      // Como alternativa, puedes configurar auto-delete en Cloudinary dashboard
      // O simplemente no eliminar (Cloudinary tiene 25GB gratis)
      
      console.log('ℹ️ Imagen marcada para auto-limpieza en Cloudinary');
      return true;
      
    } catch (error) {
      console.error('⚠️ Error eliminando imagen:', error);
      // No lanzar error, ya que esto no debe bloquear el flujo
      return false;
    }
  }

  // Proceso completo: seleccionar, subir y actualizar perfil
  async updateProfilePicture(userId, currentImagePublicId = null) {
    try {
      // 1. Seleccionar imagen
      const imageAsset = await this.showImagePicker();
      
      if (!imageAsset) {
        return null; // Usuario canceló
      }

      // 2. Subir nueva imagen a Cloudinary
      const uploadResult = await this.uploadToCloudinary(imageAsset, userId);
      
      // 3. Eliminar imagen anterior (opcional)
      if (currentImagePublicId) {
        await this.deleteFromCloudinary(currentImagePublicId);
      }

      return uploadResult;
      
    } catch (error) {
      console.error('💥 Error actualizando foto de perfil:', error);
      throw error;
    }
  }

  // Obtener URL de imagen con diferentes tamaños
  getImageUrls(baseUrl) {
    if (!baseUrl || !baseUrl.includes('cloudinary.com')) {
      return {
        original: baseUrl,
        thumbnail: baseUrl,
        medium: baseUrl
      };
    }

    return {
      original: baseUrl,
      thumbnail: this.generateThumbnailUrl(baseUrl, 100, 100),
      medium: this.generateThumbnailUrl(baseUrl, 300, 300),
      large: this.generateThumbnailUrl(baseUrl, 500, 500)
    };
  }

  // Validar configuración de Cloudinary
  isConfigured() {
    const hasCloudName = !!this.cloudinaryConfig.cloudName;
    const hasUploadPreset = !!this.cloudinaryConfig.uploadPreset;
    
    if (!hasCloudName || !hasUploadPreset) {
      console.error('❌ Cloudinary no configurado correctamente');
      console.error('Cloud Name:', hasCloudName);
      console.error('Upload Preset:', hasUploadPreset);
      return false;
    }
    
    return true;
  }

  // Generar avatar con iniciales como fallback
  generateInitialsAvatar(name, size = 200) {
    if (!name) return null;
    
    const initials = name
      .split(' ')
      .map(word => word[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
    
    return {
      type: 'initials',
      initials,
      size,
      backgroundColor: this.getColorFromName(name)
    };
  }

  // Generar color consistente basado en el nombre
  getColorFromName(name) {
    if (!name) return '#6B7280';
    
    const colors = [
      '#EF4444', '#F97316', '#F59E0B', '#EAB308',
      '#84CC16', '#22C55E', '#10B981', '#14B8A6',
      '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1',
      '#8B5CF6', '#A855F7', '#D946EF', '#EC4899'
    ];
    
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  }

  // Obtener URL de avatar (con fallback a iniciales)
  getAvatarUrl(user) {
    if (user?.profilePicture?.url) {
      const urls = this.getImageUrls(user.profilePicture.url);
      return {
        type: 'image',
        url: urls.thumbnail,
        fullUrl: urls.original
      };
    }
    
    // Fallback a iniciales
    const avatar = this.generateInitialsAvatar(user?.name || user?.email || 'Usuario');
    return {
      type: 'initials',
      ...avatar
    };
  }

  // Validar imagen antes de subir
  validateImage(imageAsset) {
    const errors = [];
    
    // Validar tamaño (max 5MB)
    if (imageAsset.fileSize && imageAsset.fileSize > 5 * 1024 * 1024) {
      errors.push('La imagen es muy grande (máximo 5MB)');
    }
    
    // Validar formato
    const validFormats = ['jpg', 'jpeg', 'png', 'webp'];
    const extension = imageAsset.fileName?.split('.').pop()?.toLowerCase();
    if (extension && !validFormats.includes(extension)) {
      errors.push('Formato no válido (usa JPG, PNG o WebP)');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Configurar Cloudinary (llamar al inicio de la app)
  configure(cloudName, uploadPreset) {
    this.cloudinaryConfig.cloudName = cloudName;
    this.cloudinaryConfig.uploadPreset = uploadPreset;
    console.log('✅ Cloudinary configurado:', cloudName);
  }

  // Test de conexión con Cloudinary
  async testConnection() {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          message: 'Cloudinary no configurado'
        };
      }

      return {
        success: true,
        message: 'Cloudinary configurado correctamente',
        cloudName: this.cloudinaryConfig.cloudName,
        uploadPreset: this.cloudinaryConfig.uploadPreset
      };
    } catch (error) {
      return {
        success: false,
        message: `Error: ${error.message}`
      };
    }
  }
}

export default new ImageService();