import { StatusBar } from 'expo-status-bar';
import { useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, Image, Dimensions, Animated, PanResponder } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
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
  const [clickCount, setClickCount] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [stickers, setStickers] = useState([]);
  const cameraRef = useRef(null);
  const photoContainerRef = useRef(null);

  const availableStickers = ['😀', '😎', '🦷', '⭐', '❤️', '🎉', '🔥', '✨', '🌈', '🦄'];

  const handlePress = () => {
    setClickCount(clickCount + 1);
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

  const saveToGallery = async () => {
    try {
      // Capture the photo container with stickers
      const uri = await captureRef(photoContainerRef, {
        format: 'jpg',
        quality: 0.9,
      });

      // Save using the simple createAssetAsync API
      // This will automatically request permission on first use
      await MediaLibrary.createAssetAsync(uri);
      
      Alert.alert('Success!', 'Photo saved to gallery! 🎉');
    } catch (error) {
      console.error('Save error:', error);
      
      // Check if it's a permission error
      if (error.message && error.message.includes('permission')) {
        Alert.alert('Permission Needed', 'Please grant photo library permission in your device settings to save photos.');
      } else {
        Alert.alert('Error', `Failed to save photo: ${error.message}`);
      }
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
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
              <View style={styles.stickerGrid}>
                {availableStickers.map((emoji, index) => (
                  <TouchableOpacity 
                    key={index}
                    style={styles.stickerOption}
                    onPress={() => addSticker(emoji)}
                  >
                    <Text style={styles.stickerOptionEmoji}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
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
          <Text style={styles.title}>🦷 Hello Alphie! 🦷</Text>
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

          <TouchableOpacity style={styles.button} onPress={handlePress}>
            <Text style={styles.buttonText}>Tap Me!</Text>
          </TouchableOpacity>

          {clickCount > 0 && (
            <View style={styles.counterBox}>
              <Text style={styles.counterText}>
                You've tapped {clickCount} time{clickCount !== 1 ? 's' : ''}!
              </Text>
            </View>
          )}

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
    marginBottom: 80,
  },
  stickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c5aa0',
    marginBottom: 15,
    textAlign: 'center',
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
});
