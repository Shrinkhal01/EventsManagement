// EventForm.tsx
import React, { useState } from 'react';
import { View, TextInput, Button, StyleSheet, Alert } from 'react-native';

interface EventFormProps {
  media: string | null;
  onClose: () => void;
  location: {
    latitude: number;
    longitude: number;
  };
}

const EventForm: React.FC<EventFormProps> = ({ media, onClose, location }) => {
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!title || !tags) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('tags', tags);
      formData.append('lat', location.latitude.toString());
      formData.append('long', location.longitude.toString());
      
      // Append the image file
      if (media) {
        const uriParts = media.split('.');
        const fileType = uriParts[uriParts.length - 1];
        
        formData.append('image', {
          uri: media,
          name: `photo.${fileType}`,
          type: `image/${fileType}`,
        } as any);
      }

      const response = await fetch('http://192.168.65.55:4000/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to upload event');
      }

      Alert.alert('Success', 'Event uploaded successfully');
      onClose();
    } catch (error) {
      console.error('Error uploading event:', error);
      Alert.alert('Error', 'Failed to upload event. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Title"
        value={title}
        onChangeText={setTitle}
        placeholderTextColor="#999"
      />
      <TextInput
        style={styles.input}
        placeholder="Tags (e.g., Accident, Fire, Roadblock)"
        value={tags}
        onChangeText={setTags}
        placeholderTextColor="#999"
      />
      <View style={styles.buttonRow}>
        <Button title="Submit" onPress={handleSubmit} disabled={isSubmitting} />
        <Button title="Cancel" onPress={onClose} color="#777" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#333',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#444',
    color: 'white',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

export default EventForm;