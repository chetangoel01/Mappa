import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native'
import Icon from 'react-native-vector-icons/MaterialIcons'
import { useThemeStore } from '../store/themeStore'
import { useMapSettingsStore, MapType } from '../store/mapSettingsStore'
import { lightTheme, darkTheme } from '../theme/colors'

interface MapTypeOption {
  value: MapType
  label: string
  description: string
  icon: string
}

const mapTypeOptions: MapTypeOption[] = [
  {
    value: 'standard',
    label: 'Standard',
    description: 'Classic street map view',
    icon: 'map'
  },
  {
    value: 'satellite',
    label: 'Satellite',
    description: 'Aerial satellite imagery',
    icon: 'satellite'
  },
  {
    value: 'hybrid',
    label: 'Hybrid',
    description: 'Satellite with street labels',
    icon: 'layers'
  },
  {
    value: 'terrain',
    label: 'Terrain',
    description: 'Topographic terrain view',
    icon: 'terrain'
  }
]

interface MapTypeSelectorProps {
  visible: boolean
  onClose: () => void
}

export default function MapTypeSelector({ visible, onClose }: MapTypeSelectorProps) {
  const { isDarkMode } = useThemeStore()
  const { mapType, setMapType } = useMapSettingsStore()
  const theme = isDarkMode ? darkTheme : lightTheme

  const handleSelectMapType = async (selectedMapType: MapType) => {
    await setMapType(selectedMapType)
    onClose()
  }

  const getMapTypeLabel = (type: MapType) => {
    return mapTypeOptions.find(option => option.value === type)?.label || 'Standard'
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: theme.surface }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Map Type</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.optionsContainer} showsVerticalScrollIndicator={false}>
            {mapTypeOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionItem,
                  { 
                    backgroundColor: mapType === option.value ? theme.primary + '20' : theme.background,
                    borderColor: mapType === option.value ? theme.primary : theme.border
                  }
                ]}
                onPress={() => handleSelectMapType(option.value)}
              >
                <View style={styles.optionContent}>
                  <View style={styles.optionIconContainer}>
                    <Icon 
                      name={option.icon} 
                      size={24} 
                      color={mapType === option.value ? theme.primary : theme.textSecondary} 
                    />
                  </View>
                  <View style={styles.optionText}>
                    <Text style={[styles.optionLabel, { color: theme.text }]}>
                      {option.label}
                    </Text>
                    <Text style={[styles.optionDescription, { color: theme.textSecondary }]}>
                      {option.description}
                    </Text>
                  </View>
                  {mapType === option.value && (
                    <Icon name="check" size={20} color={theme.primary} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  optionsContainer: {
    padding: 20,
  },
  optionItem: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  optionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 14,
  },
}) 