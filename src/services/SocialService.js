// src/services/SocialService.js - Servicio social completo para Tranki
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  addDoc,
  query, 
  where, 
  orderBy,
  serverTimestamp,
  deleteDoc,
  writeBatch,
  updateDoc,
  arrayUnion,
  arrayRemove,
  increment
} from '@react-native-firebase/firestore';
import { getApp } from '@react-native-firebase/app';
import { formatDate } from '../utils/dateUtils';

class SocialService {
  constructor() {
    this.app = getApp();
    this.db = getFirestore(this.app);
    
    console.log('👥 Social Service inicializado');
  }

  // ========== GESTIÓN DE USUARIOS Y PERFILES ==========

  // Actualizar foto de perfil
  async updateProfilePicture(userId, imageData) {
    try {
      const userDocRef = doc(this.db, 'users', userId);
      await updateDoc(userDocRef, {
        profilePicture: imageData,
        updatedAt: serverTimestamp()
      });
      
      console.log('✅ Foto de perfil actualizada en Firestore');
      return true;
    } catch (error) {
      console.error('❌ Error actualizando foto de perfil:', error);
      throw error;
    }
  }

  // Buscar usuarios por email o nombre
  async searchUsers(searchTerm, currentUserId) {
    try {
      const usersRef = collection(this.db, 'users');
      
      // Buscar por email (exacto)
      const emailQuery = query(
        usersRef,
        where('email', '==', searchTerm.toLowerCase())
      );
      
      // Buscar por nombre (esto es más limitado en Firestore)
      const nameQuery = query(
        usersRef,
        where('name', '>=', searchTerm),
        where('name', '<=', searchTerm + '\uf8ff')
      );

      const [emailSnapshot, nameSnapshot] = await Promise.all([
        getDocs(emailQuery),
        getDocs(nameQuery)
      ]);

      const users = new Map();
      
      // Combinar resultados y evitar duplicados
      [...emailSnapshot.docs, ...nameSnapshot.docs].forEach(doc => {
        const userData = doc.data();
        if (doc.id !== currentUserId) { // No incluir al usuario actual
          users.set(doc.id, {
            id: doc.id,
            name: userData.name,
            email: userData.email,
            profilePicture: userData.profilePicture,
            isOnline: userData.isOnline || false,
            lastSeen: userData.lastSeen
          });
        }
      });

      return Array.from(users.values());
    } catch (error) {
      console.error('❌ Error buscando usuarios:', error);
      return [];
    }
  }

  // ========== SISTEMA DE AMIGOS ==========

  // Enviar solicitud de amistad
  async sendFriendRequest(fromUserId, toUserId) {
    try {
      // Verificar que no sean ya amigos
      const existingFriendship = await this.checkFriendshipStatus(fromUserId, toUserId);
      if (existingFriendship.status === 'friends') {
        throw new Error('Ya son amigos');
      }
      if (existingFriendship.status === 'pending') {
        throw new Error('Ya hay una solicitud pendiente');
      }

      const requestData = {
        fromUserId,
        toUserId,
        status: 'pending',
        createdAt: serverTimestamp(),
        type: 'friend_request'
      };

      // Crear solicitud
      const requestsRef = collection(this.db, 'friendRequests');
      await addDoc(requestsRef, requestData);

      // Actualizar contadores
      await this.updateUserStats(toUserId, { receivedFriendRequests: increment(1) });

      console.log('✅ Solicitud de amistad enviada');
      return true;
    } catch (error) {
      console.error('❌ Error enviando solicitud de amistad:', error);
      throw error;
    }
  }

  // Aceptar solicitud de amistad
  async acceptFriendRequest(requestId, fromUserId, toUserId) {
    try {
      const batch = writeBatch(this.db);

      // Actualizar la solicitud
      const requestRef = doc(this.db, 'friendRequests', requestId);
      batch.update(requestRef, {
        status: 'accepted',
        acceptedAt: serverTimestamp()
      });

      // Crear relación de amistad bidireccional
      const friendshipId1 = `${fromUserId}_${toUserId}`;
      const friendshipId2 = `${toUserId}_${fromUserId}`;

      const friendshipData = {
        createdAt: serverTimestamp(),
        status: 'active'
      };

      batch.set(doc(this.db, 'friendships', friendshipId1), {
        ...friendshipData,
        userId: fromUserId,
        friendId: toUserId
      });

      batch.set(doc(this.db, 'friendships', friendshipId2), {
        ...friendshipData,
        userId: toUserId,
        friendId: fromUserId
      });

      await batch.commit();

      // Actualizar contadores
      await Promise.all([
        this.updateUserStats(fromUserId, { friendsCount: increment(1) }),
        this.updateUserStats(toUserId, { friendsCount: increment(1) })
      ]);

      console.log('✅ Solicitud de amistad aceptada');
      return true;
    } catch (error) {
      console.error('❌ Error aceptando solicitud:', error);
      throw error;
    }
  }

  // Rechazar solicitud de amistad
  async declineFriendRequest(requestId) {
    try {
      const requestRef = doc(this.db, 'friendRequests', requestId);
      await updateDoc(requestRef, {
        status: 'declined',
        declinedAt: serverTimestamp()
      });

      console.log('✅ Solicitud rechazada');
      return true;
    } catch (error) {
      console.error('❌ Error rechazando solicitud:', error);
      throw error;
    }
  }

  // Obtener solicitudes de amistad pendientes
  async getFriendRequests(userId) {
    try {
      const requestsRef = collection(this.db, 'friendRequests');
      const q = query(
        requestsRef,
        where('toUserId', '==', userId),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const requests = [];

      for (const docSnap of snapshot.docs) {
        const requestData = docSnap.data();
        
        // Obtener datos del usuario que envió la solicitud
        const fromUserDoc = await getDoc(doc(this.db, 'users', requestData.fromUserId));
        const fromUserData = fromUserDoc.exists() ? fromUserDoc.data() : null;

        requests.push({
          id: docSnap.id,
          ...requestData,
          fromUser: fromUserData ? {
            id: requestData.fromUserId,
            name: fromUserData.name,
            email: fromUserData.email,
            profilePicture: fromUserData.profilePicture
          } : null
        });
      }

      return requests;
    } catch (error) {
      console.error('❌ Error obteniendo solicitudes:', error);
      return [];
    }
  }

  // Obtener lista de amigos
  async getFriends(userId) {
    try {
      const friendshipsRef = collection(this.db, 'friendships');
      const q = query(
        friendshipsRef,
        where('userId', '==', userId),
        where('status', '==', 'active')
      );

      const snapshot = await getDocs(q);
      const friends = [];

      for (const docSnap of snapshot.docs) {
        const friendshipData = docSnap.data();
        
        // Obtener datos del amigo
        const friendDoc = await getDoc(doc(this.db, 'users', friendshipData.friendId));
        if (friendDoc.exists()) {
          const friendData = friendDoc.data();
          friends.push({
            id: friendshipData.friendId,
            name: friendData.name,
            email: friendData.email,
            profilePicture: friendData.profilePicture,
            isOnline: friendData.isOnline || false,
            lastSeen: friendData.lastSeen,
            friendshipDate: friendshipData.createdAt
          });
        }
      }

      return friends;
    } catch (error) {
      console.error('❌ Error obteniendo amigos:', error);
      return [];
    }
  }

  // Verificar estado de amistad
  async checkFriendshipStatus(userId1, userId2) {
    try {
      // Verificar si ya son amigos
      const friendshipId = `${userId1}_${userId2}`;
      const friendshipDoc = await getDoc(doc(this.db, 'friendships', friendshipId));
      
      if (friendshipDoc.exists()) {
        return { status: 'friends', data: friendshipDoc.data() };
      }

      // Verificar solicitudes pendientes
      const requestsRef = collection(this.db, 'friendRequests');
      const q1 = query(
        requestsRef,
        where('fromUserId', '==', userId1),
        where('toUserId', '==', userId2),
        where('status', '==', 'pending')
      );
      
      const q2 = query(
        requestsRef,
        where('fromUserId', '==', userId2),
        where('toUserId', '==', userId1),
        where('status', '==', 'pending')
      );

      const [snapshot1, snapshot2] = await Promise.all([getDocs(q1), getDocs(q2)]);

      if (!snapshot1.empty) {
        return { status: 'pending', direction: 'sent' };
      }
      if (!snapshot2.empty) {
        return { status: 'pending', direction: 'received' };
      }

      return { status: 'none' };
    } catch (error) {
      console.error('❌ Error verificando amistad:', error);
      return { status: 'error' };
    }
  }

  // Eliminar amigo
  async removeFriend(userId, friendId) {
    try {
      const batch = writeBatch(this.db);

      // Eliminar ambas relaciones de amistad
      const friendshipId1 = `${userId}_${friendId}`;
      const friendshipId2 = `${friendId}_${userId}`;

      batch.delete(doc(this.db, 'friendships', friendshipId1));
      batch.delete(doc(this.db, 'friendships', friendshipId2));

      await batch.commit();

      // Actualizar contadores
      await Promise.all([
        this.updateUserStats(userId, { friendsCount: increment(-1) }),
        this.updateUserStats(friendId, { friendsCount: increment(-1) })
      ]);

      console.log('✅ Amistad eliminada');
      return true;
    } catch (error) {
      console.error('❌ Error eliminando amistad:', error);
      throw error;
    }
  }

  // ========== ESTADOS COMPARTIDOS (HISTORIAS) ==========

  // Compartir estado emocional
  async shareEmotionalState(userId, emotionData, privacy = 'friends') {
    try {
      const shareData = {
        userId,
        emotion: emotionData.emotion,
        value: emotionData.value,
        message: emotionData.message || '',
        privacy, // 'public', 'friends', 'private'
        timestamp: new Date().toISOString(),
        date: formatDate(new Date()),
        likes: [],
        comments: [],
        createdAt: serverTimestamp(),
        type: 'emotion_share'
      };

      const sharesRef = collection(this.db, 'sharedStates');
      const shareDoc = await addDoc(sharesRef, shareData);

      // Actualizar contador del usuario
      await this.updateUserStats(userId, { sharedStatesCount: increment(1) });

      console.log('✅ Estado emocional compartido');
      return shareDoc.id;
    } catch (error) {
      console.error('❌ Error compartiendo estado:', error);
      throw error;
    }
  }

  // Obtener feed social (estados de amigos)
  async getSocialFeed(userId, limit = 20) {
    try {
      // Obtener lista de amigos
      const friends = await this.getFriends(userId);
      const friendIds = friends.map(friend => friend.id);
      friendIds.push(userId); // Incluir estados propios

      if (friendIds.length === 0) {
        return [];
      }

      const sharesRef = collection(this.db, 'sharedStates');
      const q = query(
        sharesRef,
        where('userId', 'in', friendIds.slice(0, 10)), // Firestore limita 'in' a 10 elementos
        where('privacy', 'in', ['public', 'friends']),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(q);
      const feedItems = [];

      for (const docSnap of snapshot.docs) {
        const shareData = docSnap.data();
        
        // Obtener datos del usuario
        const userDoc = await getDoc(doc(this.db, 'users', shareData.userId));
        const userData = userDoc.exists() ? userDoc.data() : null;

        feedItems.push({
          id: docSnap.id,
          ...shareData,
          user: userData ? {
            id: shareData.userId,
            name: userData.name,
            profilePicture: userData.profilePicture
          } : null,
          isLiked: shareData.likes?.includes(userId) || false,
          likesCount: shareData.likes?.length || 0,
          commentsCount: shareData.comments?.length || 0
        });
      }

      return feedItems;
    } catch (error) {
      console.error('❌ Error obteniendo feed social:', error);
      return [];
    }
  }

  // Dar like a un estado compartido
  async likeSharedState(shareId, userId) {
    try {
      const shareRef = doc(this.db, 'sharedStates', shareId);
      const shareDoc = await getDoc(shareRef);
      
      if (!shareDoc.exists()) {
        throw new Error('Estado compartido no encontrado');
      }

      const shareData = shareDoc.data();
      const currentLikes = shareData.likes || [];
      
      if (currentLikes.includes(userId)) {
        // Quitar like
        await updateDoc(shareRef, {
          likes: arrayRemove(userId)
        });
        
        // Decrementar contador del autor
        await this.updateUserStats(shareData.userId, { receivedLikesCount: increment(-1) });
      } else {
        // Dar like
        await updateDoc(shareRef, {
          likes: arrayUnion(userId)
        });
        
        // Incrementar contador del autor
        await this.updateUserStats(shareData.userId, { receivedLikesCount: increment(1) });
      }

      console.log('✅ Like actualizado');
      return true;
    } catch (error) {
      console.error('❌ Error actualizando like:', error);
      throw error;
    }
  }

  // Comentar en un estado compartido
  async commentOnSharedState(shareId, userId, commentText) {
    try {
      const comment = {
        userId,
        text: commentText,
        timestamp: new Date().toISOString(),
        createdAt: serverTimestamp()
      };

      const shareRef = doc(this.db, 'sharedStates', shareId);
      await updateDoc(shareRef, {
        comments: arrayUnion(comment)
      });

      console.log('✅ Comentario agregado');
      return true;
    } catch (error) {
      console.error('❌ Error agregando comentario:', error);
      throw error;
    }
  }

  // ========== ESTADÍSTICAS SOCIALES ==========

  // Obtener estadísticas sociales del usuario
  async getUserSocialStats(userId) {
    try {
      const userDoc = await getDoc(doc(this.db, 'users', userId));
      const userData = userDoc.exists() ? userDoc.data() : {};

      return {
        friendsCount: userData.friendsCount || 0,
        sharedStatesCount: userData.sharedStatesCount || 0,
        receivedLikesCount: userData.receivedLikesCount || 0,
        receivedFriendRequests: userData.receivedFriendRequests || 0
      };
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas sociales:', error);
      return {
        friendsCount: 0,
        sharedStatesCount: 0,
        receivedLikesCount: 0,
        receivedFriendRequests: 0
      };
    }
  }

  // Actualizar estadísticas del usuario
  async updateUserStats(userId, updates) {
    try {
      const userRef = doc(this.db, 'users', userId);
      await updateDoc(userRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('❌ Error actualizando estadísticas:', error);
    }
  }

  // ========== CONFIGURACIÓN Y UTILIDADES ==========

  // Actualizar estado online del usuario
  async updateOnlineStatus(userId, isOnline) {
    try {
      const userRef = doc(this.db, 'users', userId);
      await updateDoc(userRef, {
        isOnline,
        lastSeen: serverTimestamp()
      });
    } catch (error) {
      console.error('❌ Error actualizando estado online:', error);
    }
  }

  // Obtener sugerencias de amigos
  async getFriendSuggestions(userId, limit = 10) {
    try {
      // Obtener amigos actuales
      const currentFriends = await this.getFriends(userId);
      const friendIds = currentFriends.map(friend => friend.id);
      friendIds.push(userId); // Excluir al usuario actual

      // Buscar usuarios que no sean amigos
      const usersRef = collection(this.db, 'users');
      const snapshot = await getDocs(usersRef);
      
      const suggestions = [];
      
      snapshot.docs.forEach(doc => {
        if (!friendIds.includes(doc.id) && suggestions.length < limit) {
          const userData = doc.data();
          suggestions.push({
            id: doc.id,
            name: userData.name,
            email: userData.email,
            profilePicture: userData.profilePicture,
            mutualFriends: 0 // TODO: Calcular amigos mutuos
          });
        }
      });

      return suggestions;
    } catch (error) {
      console.error('❌ Error obteniendo sugerencias:', error);
      return [];
    }
  }

  // Verificar si el servicio está configurado correctamente
  isConfigured() {
    return !!this.db;
  }

  // Test de conexión
  async testConnection() {
    try {
      // Test básico escribiendo y leyendo un documento
      const testRef = doc(this.db, 'test', 'connection');
      await setDoc(testRef, { timestamp: serverTimestamp() });
      
      const testDoc = await getDoc(testRef);
      await deleteDoc(testRef); // Limpiar
      
      return {
        success: testDoc.exists(),
        message: 'Social Service funcionando correctamente'
      };
    } catch (error) {
      return {
        success: false,
        message: `Error: ${error.message}`
      };
    }
  }
}

export default new SocialService();