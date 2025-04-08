import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, Image, Modal, ActivityIndicator, PermissionsAndroid, Platform } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import Geocoding from 'react-native-geocoding';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import Geolocation from 'react-native-geolocation-service'; // Import Geolocation
import BottomBar from './src/components/imageButton';
import EventForm from './src/components/eventForm';
import * as Location from 'expo-location';
import * as EventEmitter from 'events'
import { METHODS } from 'http';



const mapApi: string = process.env.MAP_API || "";
Geocoding.init(mapApi);

// Backend API URL - replace with your actual server address
const API_BASE_URL = 'http://192.168.65.55:4000';

// Define an interface for your event structure based on your MongoDB schema
interface EventLocation {
  type: string;
  coordinates: number[];
}

interface Event {
  _id: string; // MongoDB _id
  title: string;
  imagePath: string;
  tags: string;
  location: EventLocation;
  createdAt: string;
}

const App = () => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  // Set default location (will be overridden by user location if available)
  const [location, setLocation] = useState({
    latitude: 30.3165,
    longitude: 78.0322,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [media, setMedia] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [buttonVisible, setButtonVisible] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);

  // Request location permission
  const requestLocationPermission = async () => {
    try {
      if (Platform.OS === 'ios') {
        const granted = await Geolocation.requestAuthorization('whenInUse');
        return granted === 'granted';
      } else {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: "Location Permission",
            message: "This app needs access to your location to show it on the map.",
            buttonNeutral: "Ask Me Later",
            buttonNegative: "Cancel",
            buttonPositive: "OK"
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
    } catch (err) {
      console.warn('Error requesting location permission:', err);
      return false;
    }
  };

  // Function to get current location
  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setError('Permission to access location was denied');
        return;
      }
      
      const position = await Location.getCurrentPositionAsync({});
      const lat=position.coords.latitude||30.3165;
      const long=position.coords.longitude||78.0322;

      setLocation({latitude:lat,longitude: long,latitudeDelta: 0.01,
        longitudeDelta: 0.01, });
      setCurrentLocation({latitude:lat,longitude:long})
      setError(null);
    } catch (err) {
      console.warn('Error requesting location permission:', err);
    }
  };

  // Function to fetch events from backend based on location
  const fetchEvents = async (latitude: number, longitude: number) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/events?latitude=${latitude}&longitude=${longitude}`,
        {method:'GET'}
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch events from server');
      }
      
      const data = await response.json();
      console.log('Fetched events:', data);
      setEvents(data);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Failed to load events. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Setup initial location and permissions when component mounts
  useEffect(() => {
    const setup = async () => {
      try {
        // First fetch events at default location
        fetchEvents(location.latitude, location.longitude);
        
        // Then try to get permission and update with user location
        const hasPermission = await requestLocationPermission();
        console.log('Location permission granted:', hasPermission);
        setLocationPermissionGranted(hasPermission);
        
        if (hasPermission) {
          getCurrentLocation();
        }
      } catch (e) {
        console.error('Setup error:', e);
        setError('Error initializing app. Using default location.');
      }
    };
    
    setup();
  }, []);

  const handleMediaSelection = (type: 'capture' | 'library') => {
    const options = { mediaType: 'mixed' as const };

    const callback = (response: any) => {
      if (!response.didCancel && response.assets) {
        setMedia(response.assets[0].uri);
        setShowForm(true);
      }
      setModalVisible(false);
    };

    if (type === 'capture') {
      launchCamera(options, callback);
    } else {
      launchImageLibrary(options, callback);
    }
  };

  const handleSearch = () => {
    if (!searchQuery) {
      Alert.alert('Error', 'Please enter a location');
      return;
    }
    
    setIsLoading(true);
    
    Geocoding.from(searchQuery)
      .then((json) => {
        const { lat, lng } = json.results[0].geometry.location;
        
        const newLocation = {
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        
        setLocation(newLocation);
        
        // Fetch events for the new location
        fetchEvents(lat, lng);
      })
      .catch((error) => {
        setError('Failed to fetch location. Please try again.');
        console.error(error);
        setIsLoading(false);
      });
  };

  // Function to return the correct image for the event type
  const getEventImage = (eventType: string) => {
    switch (eventType) {
      case 'Accident':
        return require('./assets/images/accident.png');
      case 'Roadblock':
        return require('./assets/images/roadblock.png');
      case 'Fire':
        return require('./assets/images/fire.png');
      case 'Protest':
        return require('./assets/images/protest.png');
      default:
        return require('./assets/images/default.png');
    }
  };

  // Dark mode styling for the map
  const mapCustomStyle = [ { "elementType": "geometry", "stylers": [ { "color": "#242f3e" } ] }, { "elementType": "labels.text.fill", "stylers": [ { "color": "#746855" } ] }, { "elementType": "labels.text.stroke", "stylers": [ { "color": "#242f3e" } ] }, { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [ { "color": "#d59563" } ] }, { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [ { "color": "#d59563" } ] }, { "featureType": "poi.park", "elementType": "geometry", "stylers": [ { "color": "#263c3f" } ] }, { "featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [ { "color": "#6b9a76" } ] }, { "featureType": "road", "elementType": "geometry", "stylers": [ { "color": "#38414e" } ] }, { "featureType": "road", "elementType": "geometry.stroke", "stylers": [ { "color": "#212a37" } ] }, { "featureType": "road", "elementType": "labels.text.fill", "stylers": [ { "color": "#9ca5b3" } ] }, { "featureType": "road.highway", "elementType": "geometry", "stylers": [ { "color": "#746855" } ] }, { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [ { "color": "#1f2835" } ] }, { "featureType": "road.highway", "elementType": "labels.text.fill", "stylers": [ { "color": "#f3d19c" } ] }, { "featureType": "transit", "elementType": "geometry", "stylers": [ { "color": "#2f3948" } ] }, { "featureType": "transit.station", "elementType": "labels.text.fill", "stylers": [ { "color": "#d59563" } ] }, { "featureType": "water", "elementType": "geometry", "stylers": [ { "color": "#17263c" } ] }, { "featureType": "water", "elementType": "labels.text.fill", "stylers": [ { "color": "#515c6d" } ] }, { "featureType": "water", "elementType": "labels.text.stroke", "stylers": [ { "color": "#17263c" } ] },{
    "featureType": "poi.business",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "poi.business",
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  } ]

  // Function to manually refresh events at current location
  const refreshEvents = () => {
    if (locationPermissionGranted) {
      // Refresh using current GPS location
      getCurrentLocation();
      fetchEvents(location.latitude,location.longitude)
    } else {
      // Fall back to using current map location
      fetchEvents(location.latitude, location.longitude);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Search for Location</Text>

      {/* Search Bar */}
      <TextInput
        style={styles.searchBar}
        placeholder="Enter a location"
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholderTextColor="#ffffff"
      />
      <View style={styles.buttonRow}>
        <Button title="Search" onPress={handleSearch} color="#6200ee" />
        <Button title="Refresh" onPress={refreshEvents} color="#03DAC6" />
      </View>
      
      

      {error && <Text style={styles.errorText}>{error}</Text>}
      
      {/* Loading indicator */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6200ee" />
        </View>
      )}
      
      <MapView
        style={styles.map}
        region={location}
        showsUserLocation={true}
        customMapStyle={mapCustomStyle}
        onRegionChangeComplete={(newRegion) => {
          // Optionally fetch new events when map region changes significantly
          if (
            Math.abs(newRegion.latitude - location.latitude) > 0.01 ||
            Math.abs(newRegion.longitude - location.longitude) > 0.01
          ) {
            setLocation(newRegion);
            fetchEvents(newRegion.latitude, newRegion.longitude);
          }
        }}
      >
        {/* Add event markers to the map */}
        {events.map((event) => (
          <Marker
            key={event._id}
            coordinate={{
              // MongoDB stores coordinates as [longitude, latitude]
              latitude: event.location.coordinates[1],
              longitude: event.location.coordinates[0]
            }}
            title={event.title}
            description={event.tags}
          >
            {/* Custom image based on event type/tag */}
            <Image
              source={getEventImage(event.tags)}
              style={styles.markerImage}
            />
          </Marker>
        ))}
      </MapView>
      
      {showForm && media && <Image style={{ width: 400, height: 400 }} source={{ uri: media }} />}
      {showForm && <EventForm 
        media={media} 
        onClose={() => { setShowForm(false); setButtonVisible(true); }}
        location={currentLocation || location} // Use current GPS location if available, otherwise use map location
      />}

      {buttonVisible && <BottomBar onUploadPress={() => { setModalVisible(true); setButtonVisible(false); }} />}

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalContent}>
          <Button title="Capture Photo/Video" onPress={() => handleMediaSelection('capture')} />
          <Button title="Pick from Gallery" onPress={() => handleMediaSelection('library')} />
          <Button title="Cancel" onPress={() => { setModalVisible(false); setButtonVisible(true); }} />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#121212',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: 'white',
  },
  searchBar: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 8,
    backgroundColor: '#333333',
    color: 'white',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  locationButton: {
    marginBottom: 10,
  },
  errorText: {
    color: 'white',
    marginBottom: 10,
  },
  map: {
    flex: 1,
  },
  markerImage: {
    width: 30,
    height: 30,
  },
  formContainer: {
    position: "absolute",
    bottom: 20,
    left: 10,
    right: 10,
    elevation: 5,
    shadowOpacity: 0.3,
    zIndex: 10,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 5,
  },
  modalContent: {
    marginTop: 'auto',
    backgroundColor: '#333',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
});

export default App;