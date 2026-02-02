import { StatusBar } from 'expo-status-bar';
import { useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, Image, Dimensions, Animated, PanResponder, TextInput, Modal } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import { captureRef } from 'react-native-view-shot';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Draggable Sticker Component
const DraggableSticker = ({ sticker, onMove, onDelete }) => {
  const pan = useRef(new Animated.ValueXY({ x: sticker.x, y: sticker.y })).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({
          x: pan.x._value,
          y: pan.y._value,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: () => {
        pan.flattenOffset();
        onMove(sticker.id, pan.x._value, pan.y._value);
      },
    })
  ).current;

  // Update pan position when sticker position changes from parent
  useRef(() => {
    pan.setValue({ x: sticker.x, y: sticker.y });
  });

  return (
    <Animated.View
      style={[
        styles.sticker,
        {
          transform: [{ translateX: pan.x }, { translateY: pan.y }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity onLongPress={() => onDelete(sticker.id)} delayLongPress={500}>
        <Text style={styles.stickerEmoji}>{sticker.emoji}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function App() {
  const [userName, setUserName] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [showNameModal, setShowNameModal] = useState(true);
  const [selectedIcon, setSelectedIcon] = useState('🦷');
  const [cameraActive, setCameraActive] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [stickers, setStickers] = useState([]);
  const [profilePicture, setProfilePicture] = useState(null);
  const cameraRef = useRef(null);
  const photoContainerRef = useRef(null);

  const availableIcons = [
    { emoji: '🦷', name: 'Tooth' },
    { emoji: '💩', name: 'Poo' },
    { emoji: '🐱', name: 'Cat' },
    { emoji: '🦄', name: 'Unicorn' },
    { emoji: '🦖', name: 'Dinosaur' },
  ];

  const availableStickers = ['😀', '😎', '🦷', '⭐', '❤️', '🎉', '🔥', '✨', '🌈', '🦄', '🐱'];

  const handleNameSubmit = () => {
    if (nameInput.trim()) {
      setUserName(nameInput.trim());
      setShowNameModal(false);
    } else {
      Alert.alert('Name Required', 'Please enter your name to continue.');
    }
  };

  const showInstructions = () => {
    Alert.alert(
      '📱 App Instructions',
      '\n👤 Profile Picture:\nTap the circle at the top to choose a profile picture from your gallery.\n\n📷 Camera:\nTap "Open Camera" to take a selfie!\n\n✨ Stickers:\nAfter taking a photo, add fun stickers by tapping them. Drag stickers to move them around. Long press to delete a sticker.\n\n💾 Save:\nTap "Save" to save your decorated photo to your gallery.\n\nHave fun! 🎉',
      [{ text: 'Got it!', style: 'default' }]
    );
  };

  const toggleCamera = async () => {
    if (!cameraActive) {
      // Turning camera on
      if (!permission) {
        return; // Permission still loading
      }
      
      if (!permission.granted) {
        const { granted } = await requestPermission();
        if (!granted) {
          Alert.alert('Permission Required', 'Camera permission is needed to use this feature.');
          return;
        }
      }
      setCameraActive(true);
    } else {
      // Turning camera off
      setCameraActive(false);
    }
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync();
        setCapturedPhoto(photo.uri);
        setCameraActive(false);
        setStickers([]); // Reset stickers for new photo
      } catch (error) {
        Alert.alert('Error', 'Failed to take picture');
      }
    }
  };

  const addSticker = (emoji) => {
    const newSticker = {
      id: Date.now(),
      emoji,
      x: 50,
      y: 100,
    };
    setStickers([...stickers, newSticker]);
  };

  const moveSticker = (id, x, y) => {
    setStickers(stickers.map(sticker => 
      sticker.id === id ? { ...sticker, x, y } : sticker
    ));
  };

  const deleteSticker = (id) => {
    setStickers(stickers.filter(sticker => sticker.id !== id));
  };

  const closeEditor = () => {
    setCapturedPhoto(null);
    setStickers([]);
  };

  const pickProfilePicture = async () => {
    try {
      // Request permission to access media library
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please grant photo library access to choose a profile picture.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setProfilePicture(result.assets[0].uri);
        Alert.alert('Success!', 'Profile picture updated! 👤');
      }
    } catch (error) {
      console.error('Pick image error:', error);
      Alert.alert('Error', `Failed to pick image: ${error.message}`);
    }
  };

  const saveToGallery = async () => {
    try {
      // Request media library permission first
      const { status } = await MediaLibrary.requestPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please grant photo library permission to save photos.');
        return;
      }

      // Capture the photo container with stickers
      const uri = await captureRef(photoContainerRef, {
        format: 'jpg',
        quality: 0.9,
      });

      // Save to media library
      await MediaLibrary.createAssetAsync(uri);
      
      Alert.alert('Success!', 'Photo saved to gallery! 🎉');
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', `Failed to save photo: ${error.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      
      {/* Name Input Modal */}
      <Modal
        visible={showNameModal}
        animationType="fade"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🦷 Welcome! 🦷</Text>
            <Text style={styles.modalSubtitle}>What's your name?</Text>
            
            <TextInput
              style={styles.nameInput}
              placeholder="Enter your name"
              value={nameInput}
              onChangeText={setNameInput}
              autoFocus={true}
              onSubmitEditing={handleNameSubmit}
            />
            
            <TouchableOpacity style={styles.modalButton} onPress={handleNameSubmit}>
              <Text style={styles.modalButtonText}>Let's Go! 🚀</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {cameraActive ? (
        <View style={styles.cameraContainer}>
          <CameraView 
            ref={cameraRef}
            style={styles.camera}
            facing="front"
          />
          <TouchableOpacity 
            style={styles.closeCameraButton} 
            onPress={toggleCamera}
          >
            <Text style={styles.closeCameraText}>✕ Close Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.captureButton} 
            onPress={takePicture}
          >
            <View style={styles.captureButtonInner} />
          </TouchableOpacity>
        </View>
      ) : capturedPhoto ? (
        <View style={styles.editorContainer}>
          <ScrollView contentContainerStyle={styles.editorScroll} scrollEnabled={false}>
            <View style={styles.photoContainer} ref={photoContainerRef} collapsable={false}>
              <Image source={{ uri: capturedPhoto }} style={styles.capturedImage} />
              {stickers.map(sticker => (
                <DraggableSticker
                  key={sticker.id}
                  sticker={sticker}
                  onMove={moveSticker}
                  onDelete={deleteSticker}
                />
              ))}
            </View>
            
            <View style={styles.stickerPalette}>
              <Text style={styles.stickerTitle}>Tap to add stickers (long press to delete):</Text>
              <ScrollView 
                horizontal
                showsHorizontalScrollIndicator={true}
                contentContainerStyle={styles.stickerScrollContent}
              >
                {availableStickers.map((emoji, index) => (
                  <TouchableOpacity 
                    key={index}
                    style={styles.stickerOption}
                    onPress={() => addSticker(emoji)}
                  >
                    <Text style={styles.stickerOptionEmoji}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </ScrollView>
          
          <View style={styles.editorButtons}>
            <TouchableOpacity style={[styles.editorButton, styles.saveButton]} onPress={saveToGallery}>
              <Text style={styles.editorButtonText}>💾 Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.editorButton} onPress={closeEditor}>
              <Text style={styles.editorButtonText}>✓ Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity onPress={pickProfilePicture} style={styles.profilePictureContainer}>
            {profilePicture ? (
              <Image source={{ uri: profilePicture }} style={styles.profilePicture} />
            ) : (
              <View style={styles.profilePlaceholder}>
                <Text style={styles.profilePlaceholderText}>👤</Text>
                <Text style={styles.profilePlaceholderSubtext}>Tap to add photo</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.iconSelector}>
            <Text style={styles.iconSelectorTitle}>Choose your icon:</Text>
            <View style={styles.iconGrid}>
              {availableIcons.map((icon) => (
                <TouchableOpacity
                  key={icon.emoji}
                  style={[
                    styles.iconOption,
                    selectedIcon === icon.emoji && styles.iconOptionSelected,
                  ]}
                  onPress={() => setSelectedIcon(icon.emoji)}
                >
                  <Text style={styles.iconEmoji}>{icon.emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Text style={styles.title}>{selectedIcon} Hello {userName}! {selectedIcon}</Text>
          <Text style={styles.subtitle}>Welcome to your first mobile app!</Text>
          
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              This is the beginning of something awesome!
            </Text>
            <Text style={styles.infoText}>
              Tap the camera button below to see yourself!
            </Text>
          </View>

          <TouchableOpacity style={styles.cameraButton} onPress={toggleCamera}>
            <Text style={styles.buttonText}>📷 Open Camera</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={showInstructions}>
            <Text style={styles.buttonText}>📋 Instructions</Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              🚀 Camera feature is now active!
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f8ff',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2c5aa0',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  infoBox: {
    backgroundColor: '#e6f2ff',
    padding: 20,
    borderRadius: 15,
    marginBottom: 30,
    width: '100%',
  },
  infoText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    marginTop: 15,
  },
  cameraButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    marginBottom: 15,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  closeCameraButton: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    elevation: 5,
  },
  closeCameraText: {
    color: '#333',
    fontSize: 18,
    fontWeight: 'bold',
  },
  captureButton: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    borderWidth: 3,
    borderColor: '#333',
  },
  editorContainer: {
    flex: 1,
    backgroundColor: '#f0f8ff',
  },
  editorScroll: {
    flexGrow: 1,
    padding: 20,
  },
  photoContainer: {
    width: '100%',
    aspectRatio: 3/4,
    backgroundColor: '#000',
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 20,
    position: 'relative',
  },
  capturedImage: {
    width: '100%',
    height: '100%',
  },
  sticker: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  stickerEmoji: {
    fontSize: 50,
  },
  stickerPalette: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
  },
  stickerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c5aa0',
    marginBottom: 10,
    textAlign: 'center',
  },
  stickerScrollContent: {
    flexDirection: 'row',
    gap: 10,
    paddingRight: 10,
  },
  stickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  stickerOption: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e6f2ff',
    borderRadius: 10,
  },
  stickerOptionEmoji: {
    fontSize: 35,
  },
  editorButtons: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 15,
  },
  editorButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    elevation: 3,
  },
  saveButton: {
    backgroundColor: '#2196F3',
  },
  editorButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  buttonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  counterBox: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#fff3cd',
    borderRadius: 10,
  },
  counterText: {
    fontSize: 18,
    color: '#856404',
    fontWeight: '600',
  },
  footer: {
    marginTop: 50,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  footerText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  profilePictureContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  profilePicture: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#2196F3',
  },
  profilePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e6f2ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#2196F3',
    borderStyle: 'dashed',
  },
  profilePlaceholderText: {
    fontSize: 50,
  },
  profilePlaceholderSubtext: {
    fontSize: 12,
    color: '#2196F3',
    marginTop: 5,
    fontWeight: '600',
  },
  iconSelector: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    width: '100%',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
  },
  iconSelectorTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
    textAlign: 'center',
    fontWeight: '600',
  },
  iconGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  iconOption: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconOptionSelected: {
    backgroundColor: '#e6f2ff',
    borderColor: '#2196F3',
  },
  iconEmoji: {
    fontSize: 30,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    width: '85%',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2c5aa0',
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  nameInput: {
    width: '100%',
    borderWidth: 2,
    borderColor: '#2196F3',
    borderRadius: 15,
    padding: 15,
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    elevation: 3,
  },
  modalButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
});
