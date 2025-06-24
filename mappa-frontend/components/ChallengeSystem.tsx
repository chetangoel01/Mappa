import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SHAPE_TEMPLATES } from '../data/shapeTemplates';
import { LatLng } from './GPSTracker';

export interface Challenge {
  id: string;
  name: string;
  shape: keyof typeof SHAPE_TEMPLATES;
  difficulty: string;
  points: number;
  description: string;
  timeLimit: number;
}

interface Props {
  onChallengeSelect: (challenge: Challenge) => void;
}

const ChallengeSystem: React.FC<Props> = ({ onChallengeSelect }) => {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [progress, setProgress] = useState<Record<string, { completed: boolean; bestScore: number }>>({});

  useEffect(() => {
    const load = async () => {
      const daily: Challenge[] = [
        { id: 'heart', name: 'Heart Sketch', shape: 'heart', difficulty: 'Easy', points: 50, description: 'Draw a heart shape', timeLimit: 30 },
        { id: 'star', name: 'Star Navigator', shape: 'star', difficulty: 'Medium', points: 100, description: 'Navigate a star', timeLimit: 45 },
        { id: 'spiral', name: 'Spiral Master', shape: 'spiral', difficulty: 'Hard', points: 200, description: 'Create a spiral', timeLimit: 60 }
      ];
      setChallenges(daily);
      const stored = await AsyncStorage.getItem('challenge_progress');
      if (stored) setProgress(JSON.parse(stored));
    };
    load();
  }, []);

  const renderItem = ({ item }: { item: Challenge }) => {
    const prog = progress[item.id] || { completed: false, bestScore: 0 };
    return (
      <TouchableOpacity style={[styles.card, prog.completed && styles.done]} onPress={() => onChallengeSelect(item)}>
        <Text style={styles.name}>{item.name}</Text>
        <Text>{item.points} pts</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Daily Challenges</Text>
      <FlatList data={challenges} renderItem={renderItem} keyExtractor={i => i.id} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  card: { padding: 16, borderRadius: 8, backgroundColor: '#f8f9fa', marginBottom: 12 },
  done: { backgroundColor: '#d4edda' },
  name: { fontSize: 18, fontWeight: '600' }
});

export default ChallengeSystem;