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
  Modal
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

export default ScheduleScreen;