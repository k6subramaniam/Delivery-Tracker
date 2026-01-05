import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DatePickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
}

export const WebDatePicker: React.FC<DatePickerProps> = ({ value, onChange, placeholder = 'Select date' }) => {
  const [showPicker, setShowPicker] = useState(false);
  const [selectedYear, setSelectedYear] = useState(value?.getFullYear() || new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(value?.getMonth() || new Date().getMonth());
  const [selectedDay, setSelectedDay] = useState(value?.getDate() || new Date().getDate());

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i);
  
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const days = Array.from({ length: getDaysInMonth(selectedYear, selectedMonth) }, (_, i) => i + 1);

  const handleConfirm = () => {
    const newDate = new Date(selectedYear, selectedMonth, selectedDay);
    onChange(newDate);
    setShowPicker(false);
  };

  const handleClear = () => {
    onChange(null);
    setShowPicker(false);
  };

  return (
    <>
      <TouchableOpacity style={styles.dateButton} onPress={() => setShowPicker(true)}>
        <Ionicons name="calendar-outline" size={20} color="#6B7280" />
        <Text style={[styles.dateText, value && styles.dateTextSelected]}>
          {value ? value.toLocaleDateString() : placeholder}
        </Text>
        {value && (
          <TouchableOpacity onPress={() => onChange(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      <Modal visible={showPicker} transparent animationType="fade" onRequestClose={() => setShowPicker(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowPicker(false)}>
          <View style={styles.pickerContainer} onStartShouldSetResponder={() => true}>
            <Text style={styles.pickerTitle}>Select Date</Text>
            
            <View style={styles.selectorsRow}>
              {/* Month Selector */}
              <View style={styles.selector}>
                <Text style={styles.selectorLabel}>Month</Text>
                <View style={styles.optionsContainer}>
                  {months.map((month, index) => (
                    <TouchableOpacity
                      key={month}
                      style={[styles.option, selectedMonth === index && styles.optionSelected]}
                      onPress={() => setSelectedMonth(index)}
                    >
                      <Text style={[styles.optionText, selectedMonth === index && styles.optionTextSelected]}>
                        {month}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Day Selector */}
              <View style={styles.selector}>
                <Text style={styles.selectorLabel}>Day</Text>
                <View style={styles.optionsContainer}>
                  {days.map((day) => (
                    <TouchableOpacity
                      key={day}
                      style={[styles.option, styles.dayOption, selectedDay === day && styles.optionSelected]}
                      onPress={() => setSelectedDay(day)}
                    >
                      <Text style={[styles.optionText, selectedDay === day && styles.optionTextSelected]}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Year Selector */}
              <View style={styles.selector}>
                <Text style={styles.selectorLabel}>Year</Text>
                <View style={styles.optionsContainer}>
                  {years.map((year) => (
                    <TouchableOpacity
                      key={year}
                      style={[styles.option, selectedYear === year && styles.optionSelected]}
                      onPress={() => setSelectedYear(year)}
                    >
                      <Text style={[styles.optionText, selectedYear === year && styles.optionTextSelected]}>
                        {year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.buttonsRow}>
              <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 10,
  },
  dateText: {
    flex: 1,
    fontSize: 16,
    color: '#9CA3AF',
  },
  dateTextSelected: {
    color: '#1F2937',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 340,
    maxHeight: '80%',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 16,
  },
  selectorsRow: {
    gap: 16,
  },
  selector: {
    marginBottom: 12,
  },
  selectorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  option: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  dayOption: {
    minWidth: 40,
    alignItems: 'center',
  },
  optionSelected: {
    backgroundColor: '#3B82F6',
  },
  optionText: {
    fontSize: 14,
    color: '#4B5563',
  },
  optionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  clearButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
