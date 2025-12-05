import * as ImagePicker from 'expo-image-picker'
import * as FileSystem from 'expo-file-system'
import { Platform, Alert } from 'react-native'
import { profileAPI } from './api'

export interface ImagePickerResult {
  success: boolean
  uri?: string
  error?: string
}

export class ImageService {
  /**
   * Request camera and media library permissions
   */
  static async requestPermissions(): Promise<boolean> {
    try {
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync()
      const mediaLibraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync()
      
      return cameraPermission.status === 'granted' && mediaLibraryPermission.status === 'granted'
    } catch (error) {
      console.error('Failed to request permissions:', error)
      return false
    }
  }

  /**
   * Pick an image from the camera or gallery
   */
  static async pickImage(source: 'camera' | 'gallery'): Promise<ImagePickerResult> {
    try {
      // Check permissions first
      const hasPermissions = await this.requestPermissions()
      if (!hasPermissions) {
        Alert.alert(
          'Permission Required',
          'Camera and media library permissions are required to select profile images.'
        )
        return { success: false, error: 'Permissions not granted' }
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Square aspect ratio for profile images
        quality: 0.8,
        base64: false,
      }

      let result: ImagePicker.ImagePickerResult

      if (source === 'camera') {
        result = await ImagePicker.launchCameraAsync(options)
      } else {
        result = await ImagePicker.launchImageLibraryAsync(options)
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0]
        return {
          success: true,
          uri: asset.uri
        }
      } else {
        return { success: false, error: 'No image selected' }
      }
    } catch (error) {
      console.error('Image picking failed:', error)
      return { success: false, error: 'Failed to pick image' }
    }
  }

  /**
   * Show image source selection dialog
   */
  static async showImageSourceDialog(): Promise<ImagePickerResult> {
    return new Promise((resolve) => {
      Alert.alert(
        'Select Image Source',
        'Choose where to get your profile image from',
        [
          { text: 'Cancel', onPress: () => resolve({ success: false, error: 'Cancelled' }) },
          { 
            text: 'Camera', 
            onPress: async () => {
              const result = await this.pickImage('camera')
              resolve(result)
            }
          },
          { 
            text: 'Gallery', 
            onPress: async () => {
              const result = await this.pickImage('gallery')
              resolve(result)
            }
          }
        ]
      )
    })
  }

  /**
   * Upload image to backend
   */
  static async uploadProfileImage(imageUri: string): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
    try {
      // For now, we'll return the local URI as the image URL
      // In a real app, you would upload to a cloud service like AWS S3, Cloudinary, etc.
      // and return the public URL
      
      // TODO: Implement actual image upload to backend/cloud storage
      // const formData = new FormData()
      // formData.append('image', {
      //   uri: imageUri,
      //   type: 'image/jpeg',
      //   name: 'profile-image.jpg'
      // } as any)
      // 
      // const response = await profileAPI.uploadImage(formData)
      // return { success: true, imageUrl: response.imageUrl }

      // For now, just return the local URI
      return { success: true, imageUrl: imageUri }
    } catch (error) {
      console.error('Image upload failed:', error)
      return { success: false, error: 'Failed to upload image' }
    }
  }

  /**
   * Delete profile image
   */
  static async deleteProfileImage(): Promise<{ success: boolean; error?: string }> {
    try {
      // TODO: Implement actual image deletion from backend/cloud storage
      // await profileAPI.deleteImage()
      return { success: true }
    } catch (error) {
      console.error('Image deletion failed:', error)
      return { success: false, error: 'Failed to delete image' }
    }
  }

  /**
   * Get image file info
   */
  static async getImageInfo(uri: string): Promise<{ size: number; type: string } | null> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri)
      if (fileInfo.exists) {
        return {
          size: fileInfo.size || 0,
          type: 'image/jpeg' // Default type
        }
      }
      return null
    } catch (error) {
      console.error('Failed to get image info:', error)
      return null
    }
  }

  /**
   * Validate image (check size, format, etc.)
   */
  static async validateImage(uri: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const imageInfo = await this.getImageInfo(uri)
      if (!imageInfo) {
        return { valid: false, error: 'Invalid image file' }
      }

      // Check file size (max 5MB)
      const maxSize = 5 * 1024 * 1024 // 5MB
      if (imageInfo.size > maxSize) {
        return { valid: false, error: 'Image file too large (max 5MB)' }
      }

      return { valid: true }
    } catch (error) {
      console.error('Image validation failed:', error)
      return { valid: false, error: 'Failed to validate image' }
    }
  }
}

export default ImageService 