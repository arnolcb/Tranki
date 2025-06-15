// src/screens/ScheduleScreen.js
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
  ActivityIndicator 
} from 'react-native';
import auth from '@react-native-firebase/auth';
import { COLORS } from '../constants/colors';
import FirebaseService from '../services/firebase';

const ScheduleScreen = ({ navigation }) => {
  const [schedule, setSchedule] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState('');
  const [newEvent, setNewEvent] = useState({ title: '', startTime: '', endTime: '', type: 'class' });
  const [loading, setLoading] = useState(true);

  const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const eventTypes = {
    class: { label: 'Clase', icon: '📚', color: COLORS.primary },
    work: { label: 'Trabajo', icon: '💼', color: '#FF9800' },
    meeting: { label: 'Reunión', icon: '👥', color: '#9C27B0' },
    personal: { label: 'Personal', icon: '⭐', color: COLORS.secondary }
  };

  useEffect(() => {
    loadSchedule();
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
        Alert.alert('Éxito', 'Horario guardado correctamente');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar el horario');
    }
  };

  const addEvent = () => {
    if (!newEvent.title || !newEvent.startTime || !newEvent.endTime) {
      Alert.alert('Error', 'Por favor completa todos los campos');
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
  };

  const removeEvent = (day, eventId) => {
    const daySchedule = schedule[day] || [];
    const updatedSchedule = {
      ...schedule,
      [day]: daySchedule.filter(event => event.id !== eventId)
    };
    setSchedule(updatedSchedule);
  };

  const getFreeTime = (day) => {
    const daySchedule = schedule[day] || [];
    if (daySchedule.length === 0) return [];

    // Ordenar eventos por hora de inicio
    const sortedEvents = daySchedule.sort((a, b) => 
      a.startTime.localeCompare(b.startTime)
    );

    const freeSlots = [];
    let lastEndTime = '06:00';

    sortedEvents.forEach(event => {
      if (event.startTime > lastEndTime) {
        const duration = calculateDuration(lastEndTime, event.startTime);
        if (duration >= 30) { // Mostrar solo bloques libres de 30+ minutos
          freeSlots.push({
            startTime: lastEndTime,
            endTime: event.startTime,
            duration
          });
        }
      }
      lastEndTime = event.endTime;
    });

    // Agregar tiempo libre después del último evento
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

  const renderEvent = (event, day) => {
    const eventType = eventTypes[event.type];
    return (
      <View key={event.id} style={[styles.eventCard, { borderLeftColor: eventType.color }]}>
        <View style={styles.eventHeader}>
          <Text style={styles.eventIcon}>{eventType.icon}</Text>
          <View style={styles.eventInfo}>
            <Text style={styles.eventTitle}>{event.title}</Text>
            <Text style={styles.eventTime}>
              {event.startTime} - {event.endTime}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => removeEvent(day, event.id)}
            style={styles.deleteButton}
          >
            <Text style={styles.deleteButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderFreeTime = (freeSlot) => (
    <View key={`${freeSlot.startTime}-${freeSlot.endTime}`} style={styles.freeTimeCard}>
      <Text style={styles.freeTimeIcon}>💚</Text>
      <View style={styles.freeTimeInfo}>
        <Text style={styles.freeTimeText}>Tiempo libre</Text>
        <Text style={styles.freeTimeHours}>
          {freeSlot.startTime} - {freeSlot.endTime} ({Math.floor(freeSlot.duration / 60)}h {freeSlot.duration % 60}m)
        </Text>
        {freeSlot.duration >= 60 && (
          <Text style={styles.suggestion}>💤 Perfecto para una siesta</Text>
        )}
        {freeSlot.duration >= 30 && freeSlot.duration < 60 && (
          <Text style={styles.suggestion}>☕ Ideal para un descanso</Text>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Cargando horarios...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mis Horarios</Text>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={saveSchedule}
        >
          <Text style={styles.saveButtonText}>Guardar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {days.map(day => {
          const daySchedule = schedule[day] || [];
          const freeSlots = getFreeTime(day);
          
          return (
            <View key={day} style={styles.dayContainer}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayTitle}>{day}</Text>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => {
                    setSelectedDay(day);
                    setModalVisible(true);
                  }}
                >
                  <Text style={styles.addButtonText}>+ Agregar</Text>
                </TouchableOpacity>
              </View>

              {daySchedule.length === 0 ? (
                <View style={styles.emptyDay}>
                  <Text style={styles.emptyDayText}>Sin eventos programados</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.sectionTitle}>📅 Eventos programados</Text>
                  {daySchedule.map(event => renderEvent(event, day))}
                  
                  {freeSlots.length > 0 && (
                    <>
                      <Text style={styles.sectionTitle}>🕐 Tiempo libre disponible</Text>
                      {freeSlots.map(renderFreeTime)}
                    </>
                  )}
                </>
              )}
            </View>
          );
        })}

        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>💡 Consejos para el bienestar</Text>
          <View style={styles.tipCard}>
            <Text style={styles.tipText}>
              • Programa descansos de 15 minutos cada 2 horas{'\n'}
              • Aprovecha los espacios libres para ejercicios de respiración{'\n'}
              • Si tienes más de 1 hora libre, considera una siesta de 20-30 min{'\n'}
              • Usa los tiempos libres cortos para hidratarte y estirarte
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
            <Text style={styles.modalTitle}>Agregar evento - {selectedDay}</Text>

            <TextInput
              style={styles.input}
              placeholder="Título del evento"
              value={newEvent.title}
              onChangeText={(text) => setNewEvent({...newEvent, title: text})}
            />

            <View style={styles.typeSelector}>
              <Text style={styles.inputLabel}>Tipo de evento:</Text>
              <View style={styles.typeButtons}>
                {Object.entries(eventTypes).map(([key, type]) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.typeButton,
                      newEvent.type === key && { backgroundColor: type.color }
                    ]}
                    onPress={() => setNewEvent({...newEvent, type: key})}
                  >
                    <Text style={styles.typeButtonIcon}>{type.icon}</Text>
                    <Text style={[
                      styles.typeButtonText,
                      newEvent.type === key && { color: COLORS.white }
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.timeInputs}>
              <View style={styles.timeInput}>
                <Text style={styles.inputLabel}>Hora inicio (HH:MM)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="09:00"
                  value={newEvent.startTime}
                  onChangeText={(text) => setNewEvent({...newEvent, startTime: text})}
                />
              </View>
              <View style={styles.timeInput}>
                <Text style={styles.inputLabel}>Hora fin (HH:MM)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="10:30"
                  value={newEvent.endTime}
                  onChangeText={(text) => setNewEvent({...newEvent, endTime: text})}
                />
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={addEvent}
              >
                <Text style={styles.confirmButtonText}>Agregar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Agregar al final de src/screens/ScheduleScreen.js, ANTES de export default ScheduleScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 15,
    color: '#333333',
    fontSize: 16,
  },
  header: {
    backgroundColor: '#4A90E2',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
  },
  saveButtonText: {
    color: '#4A90E2',
    fontSize: 14,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  dayContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  addButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 10,
    marginTop: 10,
  },
  emptyDay: {
    alignItems: 'center',
    padding: 20,
  },
  emptyDayText: {
    color: '#333333',
    opacity: 0.6,
    fontStyle: 'italic',
  },
  eventCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  eventTime: {
    fontSize: 14,
    color: '#333333',
    opacity: 0.7,
  },
  deleteButton: {
    padding: 5,
  },
  deleteButtonText: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: 'bold',
  },
  freeTimeCard: {
    backgroundColor: '#E8F5E8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  freeTimeIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  freeTimeInfo: {
    flex: 1,
  },
  freeTimeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D2E',
  },
  freeTimeHours: {
    fontSize: 12,
    color: '#2E7D2E',
    opacity: 0.8,
  },
  suggestion: {
    fontSize: 12,
    color: '#2E7D2E',
    fontStyle: 'italic',
    marginTop: 2,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 5,
    fontWeight: '500',
  },
  typeSelector: {
    marginBottom: 15,
  },
  typeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  typeButton: {
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    width: '48%',
    marginBottom: 8,
  },
  typeButtonIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  typeButtonText: {
    fontSize: 12,
    color: '#333333',
  },
  timeInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeInput: {
    width: '48%',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    backgroundColor: '#E0E0E0',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 20,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#333333',
    fontWeight: 'bold',
  },
  confirmButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 20,
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  tipsContainer: {
    marginTop: 20,
    marginBottom: 30,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 10,
  },
  tipCard: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#7ED321',
  },
  tipText: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 20,
  },
});

export default ScheduleScreen;

