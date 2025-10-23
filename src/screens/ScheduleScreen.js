// src/screens/ScheduleScreen.js - Rediseño SÚPER útil y simple
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
  SafeAreaView,
  StatusBar,
  Platform,
  Animated,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import { COLORS } from '../constants/colors';
import CustomIcons from '../components/CustomIcons';
import FirebaseService from '../services/firebase';

const ScheduleScreen = ({ navigation }) => {
  const [schedule, setSchedule] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [newEvent, setNewEvent] = useState({ title: '', type: 'class', duration: 60 });
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('week'); // 'week' o 'day'
  const [currentDay, setCurrentDay] = useState(new Date().toLocaleDateString('es-ES', { weekday: 'long' }));
  const [fadeAnim] = useState(new Animated.Value(0));

  const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  
  const eventTypes = {
    class: { label: 'Clase', color: '#7DB9DE', emoji: '📚' },
    work: { label: 'Trabajo', color: '#F59E0B', emoji: '💼' },
    study: { label: 'Estudiar', color: '#8B5CF6', emoji: '📖' },
    break: { label: 'Descanso', color: '#10B981', emoji: '☕' },
    sleep: { label: 'Dormir', color: '#6366F1', emoji: '😴' },
    gym: { label: 'Ejercicio', color: '#EF4444', emoji: '💪' },
  };

  const timeSlots = Array.from({ length: 17 }, (_, i) => {
    const hour = i + 6; // 6 AM a 10 PM
    return `${hour.toString().padStart(2, '0')}:00`;
  });

  useEffect(() => {
    StatusBar.setBarStyle('dark-content');
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('transparent');
      StatusBar.setTranslucent(true);
    }
    
    loadSchedule();

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const loadSchedule = async () => {
    try {
      const user = auth().currentUser;
      if (user) {
        const userSchedule = await FirebaseService.getSchedule(user.uid);
        setSchedule(userSchedule || {});
      }
    } catch (error) {
      console.error('Error loading schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSchedule = async () => {
    try {
      const user = auth().currentUser;
      if (user) {
        await FirebaseService.saveSchedule(user.uid, schedule);
        Alert.alert('Guardado', 'Horario guardado correctamente');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar');
    }
  };

  const addEvent = () => {
    if (!newEvent.title.trim()) {
      Alert.alert('Error', 'Agrega un título');
      return;
    }

    const endHour = parseInt(selectedTime) + (newEvent.duration / 60);
    const endTime = `${endHour.toString().padStart(2, '0')}:00`;

    const daySchedule = schedule[selectedDay] || [];
    const updatedSchedule = {
      ...schedule,
      [selectedDay]: [...daySchedule, { 
        ...newEvent, 
        id: Date.now().toString(),
        startTime: selectedTime,
        endTime: endTime
      }]
    };

    setSchedule(updatedSchedule);
    setNewEvent({ title: '', type: 'class', duration: 60 });
    setModalVisible(false);
  };

  const removeEvent = (day, eventId) => {
    const daySchedule = schedule[day] || [];
    const updatedSchedule = {
      ...schedule,
      [day]: daySchedule.filter(event => event.id !== eventId)
    };
    setSchedule(updatedSchedule);
  };

  const getEventsForTimeSlot = (day, time) => {
    const daySchedule = schedule[day] || [];
    return daySchedule.filter(event => event.startTime === time);
  };

  const getTodayEvents = () => {
    return schedule[currentDay] || [];
  };

  const renderWeekView = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weekView}>
      {days.map((day) => {
        const dayEvents = schedule[day] || [];
        const isToday = day === currentDay;
        
        return (
          <TouchableOpacity
            key={day}
            style={[styles.dayColumn, isToday && styles.dayColumnToday]}
            onPress={() => {
              setCurrentDay(day);
              setViewMode('day');
            }}
            activeOpacity={0.8}
          >
            <View style={[styles.dayHeader, isToday && styles.dayHeaderToday]}>
              <Text style={[styles.dayName, isToday && styles.dayNameToday]}>
                {day.substring(0, 3)}
              </Text>
              <Text style={[styles.dayCount, isToday && styles.dayCountToday]}>
                {dayEvents.length}
              </Text>
            </View>

            <ScrollView style={styles.dayEvents} showsVerticalScrollIndicator={false}>
              {dayEvents.length === 0 ? (
                <View style={styles.emptyDay}>
                  <Text style={styles.emptyText}>Libre</Text>
                </View>
              ) : (
                dayEvents.map(event => (
                  <View
                    key={event.id}
                    style={[
                      styles.eventBlock,
                      { backgroundColor: eventTypes[event.type].color }
                    ]}
                  >
                    <Text style={styles.eventTime}>{event.startTime}</Text>
                    <Text style={styles.eventTitle} numberOfLines={2}>
                      {eventTypes[event.type].emoji} {event.title}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.addDayButton, isToday && styles.addDayButtonToday]}
              onPress={() => {
                setSelectedDay(day);
                setSelectedTime('08:00');
                setModalVisible(true);
              }}
              activeOpacity={0.8}
            >
              <CustomIcons.Plus size={14} color={COLORS.white} />
            </TouchableOpacity>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  const renderDayView = () => {
    const dayEvents = schedule[currentDay] || [];
    
    return (
      <ScrollView style={styles.dayView} showsVerticalScrollIndicator={false}>
        <View style={styles.dayViewHeader}>
          <TouchableOpacity
            style={styles.backToDayButton}
            onPress={() => setViewMode('week')}
            activeOpacity={0.8}
          >
            <CustomIcons.ChevronLeft size={16} color={COLORS.primary} />
            <Text style={styles.backToDayText}>Semana</Text>
          </TouchableOpacity>

          <Text style={styles.currentDayTitle}>{currentDay}</Text>

          <View style={styles.dayNavigator}>
            <TouchableOpacity
              onPress={() => {
                const currentIndex = days.indexOf(currentDay);
                if (currentIndex > 0) {
                  setCurrentDay(days[currentIndex - 1]);
                }
              }}
              disabled={days.indexOf(currentDay) === 0}
              activeOpacity={0.7}
            >
              <CustomIcons.ChevronLeft 
                size={20} 
                color={days.indexOf(currentDay) === 0 ? '#D1D5DB' : COLORS.text} 
              />
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => {
                const currentIndex = days.indexOf(currentDay);
                if (currentIndex < days.length - 1) {
                  setCurrentDay(days[currentIndex + 1]);
                }
              }}
              disabled={days.indexOf(currentDay) === days.length - 1}
              activeOpacity={0.7}
            >
              <CustomIcons.ChevronRight 
                size={20} 
                color={days.indexOf(currentDay) === days.length - 1 ? '#D1D5DB' : COLORS.text} 
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.timeline}>
          {timeSlots.map(time => {
            const events = getEventsForTimeSlot(currentDay, time);
            
            return (
              <View key={time} style={styles.timeSlot}>
                <View style={styles.timeLabel}>
                  <Text style={styles.timeText}>{time}</Text>
                </View>

                <TouchableOpacity
                  style={styles.timeContent}
                  onPress={() => {
                    setSelectedDay(currentDay);
                    setSelectedTime(time);
                    setModalVisible(true);
                  }}
                  activeOpacity={0.9}
                >
                  {events.length === 0 ? (
                    <View style={styles.emptySlot}>
                      <CustomIcons.Plus size={16} color="#D1D5DB" />
                    </View>
                  ) : (
                    events.map(event => (
                      <View
                        key={event.id}
                        style={[
                          styles.eventCard,
                          { borderLeftColor: eventTypes[event.type].color }
                        ]}
                      >
                        <View style={styles.eventCardHeader}>
                          <Text style={styles.eventCardTitle}>
                            {eventTypes[event.type].emoji} {event.title}
                          </Text>
                          <TouchableOpacity
                            onPress={() => removeEvent(currentDay, event.id)}
                            style={styles.deleteEventButton}
                            activeOpacity={0.7}
                          >
                            <CustomIcons.X size={14} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                        <Text style={styles.eventCardTime}>
                          {event.startTime} - {event.endTime}
                        </Text>
                        <Text style={[
                          styles.eventCardType,
                          { color: eventTypes[event.type].color }
                        ]}>
                          {eventTypes[event.type].label}
                        </Text>
                      </View>
                    ))
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <View style={styles.loadingCircle}>
            <CustomIcons.Calendar size={32} color={COLORS.white} />
          </View>
          <Text style={styles.loadingText}>Cargando horario...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <CustomIcons.ArrowLeft size={22} color={COLORS.text} />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Mi Horario</Text>
          <Text style={styles.headerSubtitle}>
            {getTodayEvents().length} eventos hoy
          </Text>
        </View>
        
        <TouchableOpacity
          style={styles.saveButton}
          onPress={saveSchedule}
          activeOpacity={0.8}
        >
          <CustomIcons.Save size={18} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* View Toggle */}
      <View style={styles.viewToggle}>
        <TouchableOpacity
          style={[styles.viewButton, viewMode === 'week' && styles.viewButtonActive]}
          onPress={() => setViewMode('week')}
          activeOpacity={0.8}
        >
          <CustomIcons.Calendar size={16} color={viewMode === 'week' ? COLORS.primary : '#9CA3AF'} />
          <Text style={[
            styles.viewButtonText,
            viewMode === 'week' && styles.viewButtonTextActive
          ]}>
            Semana
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.viewButton, viewMode === 'day' && styles.viewButtonActive]}
          onPress={() => setViewMode('day')}
          activeOpacity={0.8}
        >
          <CustomIcons.Clock size={16} color={viewMode === 'day' ? COLORS.primary : '#9CA3AF'} />
          <Text style={[
            styles.viewButtonText,
            viewMode === 'day' && styles.viewButtonTextActive
          ]}>
            Día
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {viewMode === 'week' ? renderWeekView() : renderDayView()}
      </Animated.View>

      {/* Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nuevo Evento</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.modalClose}
                activeOpacity={0.7}
              >
                <CustomIcons.X size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Título</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej. Matemáticas, Gimnasio..."
                value={newEvent.title}
                onChangeText={(text) => setNewEvent({...newEvent, title: text})}
                maxLength={30}
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.inputLabel}>Tipo</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeSelector}>
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
                    <Text style={styles.typeEmoji}>{type.emoji}</Text>
                    <Text style={[
                      styles.typeText,
                      newEvent.type === key && { color: type.color, fontWeight: '700' }
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Duración</Text>
              <View style={styles.durationSelector}>
                {[30, 60, 90, 120].map(duration => (
                  <TouchableOpacity
                    key={duration}
                    style={[
                      styles.durationButton,
                      newEvent.duration === duration && styles.durationButtonActive
                    ]}
                    onPress={() => setNewEvent({...newEvent, duration})}
                    activeOpacity={0.8}
                  >
                    <Text style={[
                      styles.durationText,
                      newEvent.duration === duration && styles.durationTextActive
                    ]}>
                      {duration < 60 ? `${duration}m` : `${duration/60}h`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.previewCard}>
                <Text style={styles.previewTitle}>Vista previa</Text>
                <Text style={styles.previewText}>
                  {selectedDay} a las {selectedTime}
                </Text>
                <Text style={styles.previewText}>
                  Duración: {newEvent.duration < 60 ? `${newEvent.duration} min` : `${newEvent.duration/60} hora${newEvent.duration > 60 ? 's' : ''}`}
                </Text>
              </View>
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
                  !newEvent.title.trim() && styles.confirmButtonDisabled
                ]}
                onPress={addEvent}
                disabled={!newEvent.title.trim()}
                activeOpacity={0.8}
              >
                <CustomIcons.Plus size={16} color={COLORS.white} />
                <Text style={styles.confirmButtonText}>Agregar</Text>
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
    backgroundColor: '#F5F5F5',
  },
  
  // Loading
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  
  // Header
  header: {
    backgroundColor: COLORS.white,
    paddingTop: Platform.OS === 'ios' ? 10 : 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  saveButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  
  // View Toggle
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    padding: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  viewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  viewButtonActive: {
    backgroundColor: '#EBF5FB',
  },
  viewButtonText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  viewButtonTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  
  // Content
  content: {
    flex: 1,
  },
  
  // Week View
  weekView: {
    flex: 1,
    padding: 16,
  },
  dayColumn: {
    width: 120,
    marginRight: 12,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dayColumnToday: {
    borderColor: COLORS.primary,
    borderWidth: 2,
    backgroundColor: '#EBF5FB',
  },
  dayHeader: {
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 12,
  },
  dayHeaderToday: {
    borderBottomColor: COLORS.primary,
  },
  dayName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  dayNameToday: {
    color: COLORS.primary,
  },
  dayCount: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  dayCountToday: {
    color: COLORS.primary,
  },
  dayEvents: {
    flex: 1,
    minHeight: 200,
  },
  emptyDay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 12,
    color: '#D1D5DB',
    fontWeight: '500',
  },
  eventBlock: {
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  eventTime: {
    fontSize: 10,
    color: COLORS.white,
    fontWeight: '700',
    marginBottom: 2,
  },
  eventTitle: {
    fontSize: 11,
    color: COLORS.white,
    fontWeight: '600',
  },
  addDayButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  addDayButtonToday: {
    backgroundColor: '#10B981',
  },
  
  // Day View
  dayView: {
    flex: 1,
    padding: 16,
  },
  dayViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backToDayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backToDayText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  currentDayTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  dayNavigator: {
    flexDirection: 'row',
    gap: 16,
  },
  timeline: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  timeSlot: {
    flexDirection: 'row',
    minHeight: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  timeLabel: {
    width: 60,
    paddingRight: 12,
    paddingTop: 4,
  },
  timeText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  timeContent: {
    flex: 1,
    paddingVertical: 4,
  },
  emptySlot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 8,
    borderStyle: 'dashed',
    minHeight: 50,
  },
  eventCard: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    marginBottom: 8,
  },
  eventCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  eventCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1,
  },
  deleteEventButton: {
    padding: 4,
  },
  eventCardTime: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  eventCardType: {
    fontSize: 11,
    fontWeight: '600',
  },
  
  // Modal
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#1A1A1A',
    marginBottom: 20,
  },
  typeSelector: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    marginRight: 8,
    gap: 6,
  },
  typeButtonActive: {
    borderWidth: 2,
  },
  typeEmoji: {
    fontSize: 16,
  },
  typeText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  durationSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  durationButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
  },
  durationButtonActive: {
    backgroundColor: '#EBF5FB',
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  durationText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  durationTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  previewCard: {
    backgroundColor: '#F0F9FF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  previewTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 8,
  },
  previewText: {
    fontSize: 14,
    color: '#0369A1',
    marginBottom: 4,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  confirmButtonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  confirmButtonText: {
    fontSize: 15,
    color: COLORS.white,
    fontWeight: '700',
  },
});

export default ScheduleScreen;