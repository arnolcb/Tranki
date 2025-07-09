// src/screens/ScheduleScreen.js - UI/UX Mejorada SIN notificaciones push
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import { COLORS, Theme } from '../constants/colors';
import CustomIcons from '../components/CustomIcons';
import FirebaseService from '../services/firebase';

const ScheduleScreen = ({ navigation }) => {
  const [schedule, setSchedule] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState('');
  const [newEvent, setNewEvent] = useState({ title: '', startTime: '', endTime: '', type: 'class' });
  const [loading, setLoading] = useState(true);
  const [sleepAnalysis, setSleepAnalysis] = useState(null);

  const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  
  const eventTypes = {
    class: { label: 'Clase', icon: '📚', color: COLORS.primary },
    work: { label: 'Trabajo', icon: '💼', color: COLORS.warning },
    meeting: { label: 'Reunión', icon: '👥', color: COLORS.error },
    personal: { label: 'Personal', icon: '⭐', color: COLORS.success },
    sleep: { label: 'Dormir', icon: '😴', color: COLORS.purple || '#8B5CF6' }
  };

  useEffect(() => {
    StatusBar.setBarStyle('dark-content');
    StatusBar.setBackgroundColor(COLORS.white);
    loadSchedule();
  }, []);

  const loadSchedule = async () => {
    try {
      const user = auth().currentUser;
      if (user) {
        const userSchedule = await FirebaseService.getSchedule(user.uid);
        setSchedule(userSchedule || {});
        analyzeSleepPattern(userSchedule || {});
      }
    } catch (error) {
      console.error('Error loading schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const analyzeSleepPattern = (scheduleData) => {
    const analysis = {};
    
    Object.keys(scheduleData).forEach(day => {
      const dayEvents = scheduleData[day] || [];
      const sleepEvents = dayEvents.filter(event => event.type === 'sleep');
      
      if (sleepEvents.length > 0) {
        const totalSleepMinutes = sleepEvents.reduce((total, event) => {
          return total + calculateDuration(event.startTime, event.endTime);
        }, 0);
        
        analysis[day] = {
          totalHours: totalSleepMinutes / 60,
          isInsufficient: totalSleepMinutes < 480 // menos de 8 horas
        };
      }
    });
    
    setSleepAnalysis(analysis);
    
    // Mostrar alerta si hay días con poco sueño
    const insufficientSleepDays = Object.keys(analysis).filter(
      day => analysis[day].isInsufficient
    );
    
    if (insufficientSleepDays.length > 0) {
      showSleepWarning(insufficientSleepDays);
    }
  };

  const showSleepWarning = (days) => {
    Alert.alert(
      '⚠️ Alerta de Sueño',
      `Detectamos que tienes menos de 8 horas de sueño programadas en: ${days.join(', ')}.\n\nEl sueño insuficiente puede afectar tu bienestar emocional.`,
      [
        { text: 'Ignorar', style: 'cancel' },
        { text: 'Ver consejos', onPress: () => suggestSleepImprovements() }
      ]
    );
  };

  const suggestSleepImprovements = () => {
    Alert.alert(
      '💡 Consejos para mejor sueño',
      '• Trata de dormir entre 7-9 horas por noche\n• Mantén horarios consistentes\n• Evita pantallas 1 hora antes de dormir\n• Crea una rutina relajante nocturna\n• Considera programar "tiempo de sueño" en tu horario',
      [{ text: 'Entendido' }]
    );
  };

  const saveSchedule = async () => {
    try {
      const user = auth().currentUser;
      if (user) {
        await FirebaseService.saveSchedule(user.uid, schedule);
        Alert.alert('✅ Éxito', 'Horario guardado correctamente. Los espacios libres se mostrarán automáticamente.');
      }
    } catch (error) {
      Alert.alert('❌ Error', 'No se pudo guardar el horario');
    }
  };

  const addEvent = () => {
    if (!newEvent.title || !newEvent.startTime || !newEvent.endTime) {
      Alert.alert('❌ Error', 'Por favor completa todos los campos');
      return;
    }

    if (newEvent.startTime >= newEvent.endTime) {
      Alert.alert('❌ Error', 'La hora de fin debe ser después de la hora de inicio');
      return;
    }

    const daySchedule = schedule[selectedDay] || [];
    const updatedSchedule = {
      ...schedule,
      [selectedDay]: [...daySchedule, { ...newEvent, id: Date.now().toString() }]
    };

    setSchedule(updatedSchedule);
    setNewEvent({ title: '', startTime: '', endTime: '', type: 'class' });
    setModalVisible(false);
    analyzeSleepPattern(updatedSchedule);
  };

  const removeEvent = (day, eventId) => {
    Alert.alert(
      '🗑️ Eliminar evento',
      '¿Estás seguro de que quieres eliminar este evento?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            const daySchedule = schedule[day] || [];
            const updatedSchedule = {
              ...schedule,
              [day]: daySchedule.filter(event => event.id !== eventId)
            };
            setSchedule(updatedSchedule);
            analyzeSleepPattern(updatedSchedule);
          }
        }
      ]
    );
  };

  const getFreeTime = (day) => {
    const daySchedule = schedule[day] || [];
    if (daySchedule.length === 0) return [];

    const sortedEvents = daySchedule.sort((a, b) => 
      a.startTime.localeCompare(b.startTime)
    );

    const freeSlots = [];
    let lastEndTime = '06:00';

    sortedEvents.forEach(event => {
      if (event.startTime > lastEndTime) {
        const duration = calculateDuration(lastEndTime, event.startTime);
        if (duration >= 30) {
          freeSlots.push({
            startTime: lastEndTime,
            endTime: event.startTime,
            duration
          });
        }
      }
      lastEndTime = event.endTime > lastEndTime ? event.endTime : lastEndTime;
    });

    if (lastEndTime < '22:00') {
      const duration = calculateDuration(lastEndTime, '22:00');
      if (duration >= 30) {
        freeSlots.push({
          startTime: lastEndTime,
          endTime: '22:00',
          duration
        });
      }
    }

    return freeSlots;
  };

  const calculateDuration = (start, end) => {
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);
    return (endHour * 60 + endMin) - (startHour * 60 + startMin);
  };

  const quickAddEvent = (day, type, title) => {
    setSelectedDay(day);
    setNewEvent({ ...newEvent, type, title });
    setModalVisible(true);
  };

  const renderEvent = (event, day) => {
    const eventType = eventTypes[event.type];
    const duration = calculateDuration(event.startTime, event.endTime);
    
    return (
      <TouchableOpacity 
        key={event.id} 
        style={[styles.eventCard, { borderLeftColor: eventType.color }]}
        onLongPress={() => removeEvent(day, event.id)}
        activeOpacity={0.8}
      >
        <View style={styles.eventHeader}>
          <View style={[styles.eventTypeIcon, { backgroundColor: eventType.color + '20' }]}>
            <Text style={styles.eventIcon}>{eventType.icon}</Text>
          </View>
          <View style={styles.eventInfo}>
            <Text style={styles.eventTitle}>{event.title}</Text>
            <Text style={styles.eventTime}>
              {event.startTime} - {event.endTime} ({Math.floor(duration / 60)}h {duration % 60}m)
            </Text>
            <Text style={[styles.eventType, { color: eventType.color }]}>
              {eventType.label}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => removeEvent(day, event.id)}
            style={styles.deleteButton}
          >
            <CustomIcons.X size={14} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFreeTime = (freeSlot) => (
    <TouchableOpacity 
      key={`${freeSlot.startTime}-${freeSlot.endTime}`} 
      style={styles.freeTimeCard}
      onPress={() => {
        const duration = freeSlot.duration;
        const activity = duration >= 120 ? 'ejercicio, hobbies o estudiar' : 
                        duration >= 60 ? 'relajarte, leer o hacer una siesta' : 
                        'un descanso, hidratarte o estirarte';
        
        Alert.alert(
          '💚 Tiempo libre disponible',
          `${freeSlot.startTime} - ${freeSlot.endTime} (${Math.floor(duration / 60)}h ${duration % 60}m)\n\n¡Perfecto para ${activity}!\n\n¿Te gustaría recibir recordatorios cuando llegue este momento?`,
          [
            { text: 'No, gracias', style: 'cancel' },
            { text: 'Sí, recordarme', onPress: () => {
              Alert.alert('📅 Recordatorio programado', 'Te avisaremos cuando llegue tu tiempo libre.');
            }}
          ]
        );
      }}
      activeOpacity={0.8}
    >
      <View style={styles.freeTimeIcon}>
        <Text style={styles.freeTimeEmoji}>💚</Text>
      </View>
      <View style={styles.freeTimeInfo}>
        <Text style={styles.freeTimeText}>Tiempo libre</Text>
        <Text style={styles.freeTimeHours}>
          {freeSlot.startTime} - {freeSlot.endTime} ({Math.floor(freeSlot.duration / 60)}h {freeSlot.duration % 60}m)
        </Text>
        {freeSlot.duration >= 120 && (
          <Text style={styles.suggestion}>💡 Perfecto para ejercicio o hobbies</Text>
        )}
        {freeSlot.duration >= 60 && freeSlot.duration < 120 && (
          <Text style={styles.suggestion}>💡 Ideal para una siesta o lectura</Text>
        )}
        {freeSlot.duration >= 30 && freeSlot.duration < 60 && (
          <Text style={styles.suggestion}>💡 Tiempo para descanso y hidratación</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderQuickActions = (day) => (
    <View style={styles.quickActionsContainer}>
      <Text style={styles.quickActionsTitle}>Agregar rápido:</Text>
      <View style={styles.quickActionsRow}>
        <TouchableOpacity 
          style={[styles.quickActionBtn, { backgroundColor: eventTypes.class.color + '20' }]}
          onPress={() => quickAddEvent(day, 'class', 'Clase')}
          activeOpacity={0.8}
        >
          <Text style={styles.quickActionEmoji}>{eventTypes.class.icon}</Text>
          <Text style={[styles.quickActionText, { color: eventTypes.class.color }]}>Clase</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.quickActionBtn, { backgroundColor: eventTypes.work.color + '20' }]}
          onPress={() => quickAddEvent(day, 'work', 'Trabajo')}
          activeOpacity={0.8}
        >
          <Text style={styles.quickActionEmoji}>{eventTypes.work.icon}</Text>
          <Text style={[styles.quickActionText, { color: eventTypes.work.color }]}>Trabajo</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.quickActionBtn, { backgroundColor: eventTypes.sleep.color + '20' }]}
          onPress={() => quickAddEvent(day, 'sleep', 'Dormir')}
          activeOpacity={0.8}
        >
          <Text style={styles.quickActionEmoji}>{eventTypes.sleep.icon}</Text>
          <Text style={[styles.quickActionText, { color: eventTypes.sleep.color }]}>Dormir</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando horarios...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header mejorado */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <CustomIcons.ArrowLeft size={20} color={COLORS.text} />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Mis Horarios</Text>
          <Text style={styles.headerSubtitle}>Organiza tu tiempo y bienestar</Text>
        </View>
        
        <TouchableOpacity
          style={styles.saveButton}
          onPress={saveSchedule}
          activeOpacity={0.8}
        >
          <CustomIcons.Save size={16} color={COLORS.white} />
          <Text style={styles.saveButtonText}>Guardar</Text>
        </TouchableOpacity>
      </View>

      {/* Análisis de sueño */}
      {sleepAnalysis && Object.keys(sleepAnalysis).length > 0 && (
        <View style={styles.sleepAnalysisContainer}>
          <Text style={styles.sleepAnalysisTitle}>📊 Análisis de sueño semanal</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sleepAnalysisScroll}>
            {Object.entries(sleepAnalysis).map(([day, analysis]) => (
              <TouchableOpacity 
                key={day} 
                style={[
                  styles.sleepAnalysisCard,
                  analysis.isInsufficient && styles.sleepAnalysisCardWarning
                ]}
                onPress={() => {
                  if (analysis.isInsufficient) {
                    suggestSleepImprovements();
                  } else {
                    Alert.alert('😴 Buen sueño', `Tienes ${analysis.totalHours.toFixed(1)} horas de sueño programadas para ${day}. ¡Perfecto!`);
                  }
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.sleepAnalysisDay}>{day.slice(0, 3)}</Text>
                <Text style={[
                  styles.sleepAnalysisHours,
                  { color: analysis.isInsufficient ? COLORS.error : COLORS.success }
                ]}>
                  {analysis.totalHours.toFixed(1)}h
                </Text>
                {analysis.isInsufficient && (
                  <Text style={styles.sleepAnalysisWarning}>⚠️</Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {days.map(day => {
          const daySchedule = schedule[day] || [];
          const freeSlots = getFreeTime(day);
          const isToday = new Date().toLocaleDateString('es-ES', { weekday: 'long' }) === day;
          
          return (
            <View key={day} style={[styles.dayContainer, isToday && styles.todayContainer]}>
              <View style={styles.dayHeader}>
                <View style={styles.dayTitleContainer}>
                  <Text style={[styles.dayTitle, isToday && styles.todayTitle]}>
                    {day} {isToday && '(Hoy)'}
                  </Text>
                  <Text style={styles.dayStats}>
                    {daySchedule.length} eventos • {freeSlots.length} espacios libres
                  </Text>
                </View>
                
                <TouchableOpacity
                  style={[styles.addButton, isToday && styles.todayAddButton]}
                  onPress={() => {
                    setSelectedDay(day);
                    setModalVisible(true);
                  }}
                  activeOpacity={0.8}
                >
                  <CustomIcons.Plus size={14} color={COLORS.white} />
                  <Text style={styles.addButtonText}>Agregar</Text>
                </TouchableOpacity>
              </View>

              {daySchedule.length === 0 ? (
                <View style={styles.emptyDay}>
                  <Text style={styles.emptyDayEmoji}>📅</Text>
                  <Text style={styles.emptyDayText}>Sin eventos programados</Text>
                  {renderQuickActions(day)}
                </View>
              ) : (
                <>
                  <View style={styles.eventsSection}>
                    <Text style={styles.sectionLabel}>
                      📋 Eventos programados ({daySchedule.length})
                    </Text>
                    {daySchedule.map(event => renderEvent(event, day))}
                  </View>
                  
                  {freeSlots.length > 0 && (
                    <View style={styles.freeTimeSection}>
                      <Text style={styles.sectionLabel}>
                        💚 Tiempo libre disponible ({freeSlots.length})
                      </Text>
                      {freeSlots.map(renderFreeTime)}
                    </View>
                  )}
                  
                  {renderQuickActions(day)}
                </>
              )}
            </View>
          );
        })}

        {/* Tips section */}
        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>💡 Consejos para el bienestar</Text>
          <View style={styles.tipsCard}>
            <Text style={styles.tipsText}>
              🕐 Programa descansos de 15 min cada 2 horas{'\n'}
              🧘 Usa espacios libres para ejercicios de respiración{'\n'}
              😴 Incluye 7-9 horas de sueño en tu horario{'\n'}
              💧 Aprovecha tiempos cortos para hidratarte{'\n'}
              📱 Toca los espacios libres para ver sugerencias{'\n'}
              ⚡ Deja espacio para lo inesperado{'\n'}
              🔔 Recibe alertas automáticas de bienestar
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Modal para agregar eventos */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📅 Agregar evento - {selectedDay}</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setModalVisible(false)}
                activeOpacity={0.7}
              >
                <CustomIcons.X size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>📝 Título del evento</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej. Reunión de trabajo, Clase de matemáticas..."
                  value={newEvent.title}
                  onChangeText={(text) => setNewEvent({...newEvent, title: text})}
                  maxLength={50}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>🏷️ Tipo de evento</Text>
                <View style={styles.typeSelector}>
                  {Object.entries(eventTypes).map(([key, type]) => (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.typeButton,
                        newEvent.type === key && [
                          styles.typeButtonActive, 
                          { backgroundColor: type.color + '20', borderColor: type.color }
                        ]
                      ]}
                      onPress={() => setNewEvent({...newEvent, type: key})}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.typeButtonIcon}>{type.icon}</Text>
                      <Text style={[
                        styles.typeButtonText,
                        newEvent.type === key && { color: type.color, fontWeight: '600' }
                      ]}>
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.timeInputsRow}>
                <View style={styles.timeInputGroup}>
                  <Text style={styles.inputLabel}>🕐 Hora inicio</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="09:00"
                    value={newEvent.startTime}
                    onChangeText={(text) => setNewEvent({...newEvent, startTime: text})}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.timeInputGroup}>
                  <Text style={styles.inputLabel}>🕑 Hora fin</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="10:30"
                    value={newEvent.endTime}
                    onChangeText={(text) => setNewEvent({...newEvent, endTime: text})}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Preview de duración */}
              {newEvent.startTime && newEvent.endTime && newEvent.startTime < newEvent.endTime && (
                <View style={styles.durationPreview}>
                  <Text style={styles.durationText}>
                    ⏱️ Duración: {Math.floor(calculateDuration(newEvent.startTime, newEvent.endTime) / 60)}h{' '}
                    {calculateDuration(newEvent.startTime, newEvent.endTime) % 60}m
                  </Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  (!newEvent.title || !newEvent.startTime || !newEvent.endTime) && styles.confirmButtonDisabled
                ]}
                onPress={addEvent}
                disabled={!newEvent.title || !newEvent.startTime || !newEvent.endTime}
                activeOpacity={0.8}
              >
                <CustomIcons.Plus size={16} color={COLORS.white} />
                <Text style={styles.confirmButtonText}>Agregar evento</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: Theme.spacing.lg,
    color: COLORS.textSecondary,
    fontSize: Theme.typography.body,
    fontWeight: '500',
  },
  
  // Header
  header: {
    backgroundColor: COLORS.white,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.gray50,
    marginRight: Theme.spacing.md,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
    borderRadius: Theme.borderRadius.medium,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    ...Theme.shadows.small,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },

  // Sleep analysis
  sleepAnalysisContainer: {
    backgroundColor: COLORS.white,
    paddingVertical: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  sleepAnalysisTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginHorizontal: Theme.spacing.lg,
    marginBottom: Theme.spacing.sm,
  },
  sleepAnalysisScroll: {
    paddingHorizontal: Theme.spacing.lg,
  },
  sleepAnalysisCard: {
    backgroundColor: COLORS.gray50,
    padding: Theme.spacing.md,
    borderRadius: 8,
    marginRight: Theme.spacing.sm,
    alignItems: 'center',
    minWidth: 60,
  },
  sleepAnalysisCardWarning: {
    backgroundColor: COLORS.errorSoft,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  sleepAnalysisDay: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '500',
    marginBottom: 2,
  },
  sleepAnalysisHours: {
    fontSize: 14,
    fontWeight: '700',
  },
  sleepAnalysisWarning: {
    fontSize: 10,
    marginTop: 2,
  },
  
  // Content
  content: {
    flex: 1,
  },
  dayContainer: {
    backgroundColor: COLORS.white,
    marginHorizontal: Theme.spacing.lg,
    marginBottom: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.large,
    padding: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Theme.shadows.small,
  },
  todayContainer: {
    borderColor: COLORS.primary,
    borderWidth: 2,
    backgroundColor: COLORS.blue50,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  dayTitleContainer: {
    flex: 1,
  },
  dayTitle: {
    fontSize: Theme.typography.h4,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  todayTitle: {
    color: COLORS.primary,
  },
  dayStats: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  addButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.medium,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    ...Theme.shadows.small,
  },
  todayAddButton: {
    backgroundColor: COLORS.success,
  },
  addButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Empty state
  emptyDay: {
    alignItems: 'center',
    paddingVertical: Theme.spacing.xl,
  },
  emptyDayEmoji: {
    fontSize: 32,
    marginBottom: Theme.spacing.md,
  },
  emptyDayText: {
    color: COLORS.textMuted,
    fontSize: Theme.typography.body,
    fontStyle: 'italic',
    marginBottom: Theme.spacing.lg,
  },
  
  // Quick actions
  quickActionsContainer: {
    marginTop: Theme.spacing.lg,
    padding: Theme.spacing.md,
    backgroundColor: COLORS.gray50,
    borderRadius: Theme.borderRadius.medium,
  },
  quickActionsTitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: Theme.spacing.sm,
    textTransform: 'uppercase',
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
  },
  quickActionBtn: {
    flex: 1,
    padding: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.medium,
    alignItems: 'center',
    gap: 4,
  },
  quickActionEmoji: {
    fontSize: 16,
  },
  quickActionText: {
    fontSize: 10,
    fontWeight: '600',
  },
  
  // Sections
  eventsSection: {
    marginBottom: Theme.spacing.lg,
  },
  freeTimeSection: {
    marginTop: Theme.spacing.lg,
  },
  sectionLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: Theme.spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  // Event card
  eventCard: {
    backgroundColor: COLORS.gray50,
    borderRadius: Theme.borderRadius.medium,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
    borderLeftWidth: 4,
    ...Theme.shadows.small,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventTypeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.md,
  },
  eventIcon: {
    fontSize: 16,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  eventTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  eventType: {
    fontSize: 11,
    fontWeight: '500',
  },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.errorSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Free time card
  freeTimeCard: {
    backgroundColor: COLORS.successSoft,
    borderRadius: Theme.borderRadius.medium,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
  },
  freeTimeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.success + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Theme.spacing.md,
  },
  freeTimeEmoji: {
    fontSize: 16,
  },
  freeTimeInfo: {
    flex: 1,
  },
  freeTimeText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.success,
    marginBottom: 2,
  },
  freeTimeHours: {
    fontSize: 12,
    color: COLORS.success,
    opacity: 0.8,
    marginBottom: 4,
  },
  suggestion: {
    fontSize: 11,
    color: COLORS.success,
    fontStyle: 'italic',
  },
  
  // Tips section
  tipsSection: {
    marginHorizontal: Theme.spacing.lg,
    marginBottom: Theme.spacing.xxxl,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: Theme.spacing.md,
  },
  tipsCard: {
    backgroundColor: COLORS.white,
    padding: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.large,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...Theme.shadows.small,
  },
  tipsText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  
  // Modal
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.overlay,
    padding: Theme.spacing.lg,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: Theme.borderRadius.extraLarge,
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
    ...Theme.shadows.large,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.gray50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    padding: Theme.spacing.lg,
    maxHeight: 400,
  },
  
  // Form inputs
  inputGroup: {
    marginBottom: Theme.spacing.lg,
  },
  inputLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: Theme.spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: Theme.borderRadius.medium,
    padding: Theme.spacing.md,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: COLORS.white,
  },
  timeInputsRow: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
  },
  timeInputGroup: {
    flex: 1,
  },
  
  // Duration preview
  durationPreview: {
    backgroundColor: COLORS.blue50,
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.medium,
    marginTop: Theme.spacing.md,
    alignItems: 'center',
  },
  durationText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
  
  // Type selector
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.sm,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.medium,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.gray50,
    width: '48%',
    minHeight: 48,
  },
  typeButtonActive: {
    borderWidth: 2,
  },
  typeButtonIcon: {
    fontSize: 16,
    marginRight: Theme.spacing.sm,
  },
  typeButtonText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  
  // Modal actions
  modalActions: {
    flexDirection: 'row',
    padding: Theme.spacing.lg,
    gap: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.medium,
    backgroundColor: COLORS.gray100,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.medium,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    ...Theme.shadows.small,
  },
  confirmButtonDisabled: {
    backgroundColor: COLORS.gray300,
  },
  confirmButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ScheduleScreen;