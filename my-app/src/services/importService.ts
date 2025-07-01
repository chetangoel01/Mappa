import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system'
import { Alert } from 'react-native'

export interface ImportedRoute {
  name: string
  coordinates: Array<{ latitude: number; longitude: number }>
  mode?: string
  createdAt?: string
}

export interface ImportResult {
  success: boolean
  routes: ImportedRoute[]
  error?: string
}

export type ImportFormat = 'gpx' | 'kml' | 'json' | 'auto'

class ImportService {
  async pickFile(): Promise<DocumentPicker.DocumentPickerResult> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/gpx+xml',
          'application/vnd.google-earth.kml+xml',
          'application/json',
          'text/xml',
          '*/*'
        ],
        copyToCacheDirectory: true,
        multiple: false,
      })
      return result
    } catch (error) {
      console.error('Failed to pick file:', error)
      throw error
    }
  }

  async importFromFile(): Promise<ImportResult> {
    try {
      const result = await this.pickFile()
      
      if (result.canceled || !result.assets || result.assets.length === 0) {
        return { success: false, routes: [], error: 'No file selected' }
      }

      const file = result.assets[0]
      const fileUri = file.uri
      const fileName = file.name || ''
      const fileSize = file.size || 0

      // Check file size (max 10MB)
      if (fileSize > 10 * 1024 * 1024) {
        return { success: false, routes: [], error: 'File too large (max 10MB)' }
      }

      // Read file content
      const content = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8,
      })

      // Determine file format and parse
      const format = this.detectFormat(fileName, content)
      const routes = await this.parseFile(content, format)

      return { success: true, routes }
    } catch (error) {
      console.error('Import failed:', error)
      return { 
        success: false, 
        routes: [], 
        error: error instanceof Error ? error.message : 'Import failed' 
      }
    }
  }

  private detectFormat(fileName: string, content: string): ImportFormat {
    const lowerFileName = fileName.toLowerCase()
    const lowerContent = content.toLowerCase()

    if (lowerFileName.endsWith('.gpx') || lowerContent.includes('<gpx')) {
      return 'gpx'
    } else if (lowerFileName.endsWith('.kml') || lowerContent.includes('<kml')) {
      return 'kml'
    } else if (lowerFileName.endsWith('.json') || lowerContent.startsWith('{')) {
      return 'json'
    } else {
      return 'auto'
    }
  }

  private async parseFile(content: string, format: ImportFormat): Promise<ImportedRoute[]> {
    switch (format) {
      case 'gpx':
        return this.parseGPX(content)
      case 'kml':
        return this.parseKML(content)
      case 'json':
        return this.parseJSON(content)
      case 'auto':
        return this.parseAuto(content)
      default:
        throw new Error(`Unsupported format: ${format}`)
    }
  }

  private parseGPX(content: string): ImportedRoute[] {
    const routes: ImportedRoute[] = []
    
    try {
      // Simple GPX parsing using regex (for production, use a proper XML parser)
      const trackRegex = /<trk>([\s\S]*?)<\/trk>/g
      const nameRegex = /<name>(.*?)<\/name>/
      const trackPointRegex = /<trkpt lat="([^"]+)" lon="([^"]+)"/g

      let trackMatch
      while ((trackMatch = trackRegex.exec(content)) !== null) {
        const trackContent = trackMatch[1]
        const nameMatch = nameRegex.exec(trackContent)
        const name = nameMatch ? nameMatch[1] : `Imported Route ${routes.length + 1}`

        const coordinates: Array<{ latitude: number; longitude: number }> = []
        let pointMatch
        while ((pointMatch = trackPointRegex.exec(trackContent)) !== null) {
          coordinates.push({
            latitude: parseFloat(pointMatch[1]),
            longitude: parseFloat(pointMatch[2]),
          })
        }

        if (coordinates.length > 0) {
          routes.push({
            name,
            coordinates,
            mode: 'walking',
            createdAt: new Date().toISOString(),
          })
        }
      }
    } catch (error) {
      console.error('GPX parsing error:', error)
      throw new Error('Invalid GPX file format')
    }

    return routes
  }

  private parseKML(content: string): ImportedRoute[] {
    const routes: ImportedRoute[] = []
    
    try {
      // Simple KML parsing using regex
      const placemarkRegex = /<Placemark>([\s\S]*?)<\/Placemark>/g
      const nameRegex = /<name>(.*?)<\/name>/
      const coordinatesRegex = /<coordinates>([\s\S]*?)<\/coordinates>/

      let placemarkMatch
      while ((placemarkMatch = placemarkRegex.exec(content)) !== null) {
        const placemarkContent = placemarkMatch[1]
        const nameMatch = nameRegex.exec(placemarkContent)
        const name = nameMatch ? nameMatch[1] : `Imported Route ${routes.length + 1}`

        const coordinatesMatch = coordinatesRegex.exec(placemarkContent)
        if (coordinatesMatch) {
          const coordinatesText = coordinatesMatch[1].trim()
          const coordinates: Array<{ latitude: number; longitude: number }> = []

          // Parse coordinates (format: lon,lat,alt)
          const coordPairs = coordinatesText.split(/\s+/)
          for (const pair of coordPairs) {
            const parts = pair.split(',')
            if (parts.length >= 2) {
              coordinates.push({
                longitude: parseFloat(parts[0]),
                latitude: parseFloat(parts[1]),
              })
            }
          }

          if (coordinates.length > 0) {
            routes.push({
              name,
              coordinates,
              mode: 'walking',
              createdAt: new Date().toISOString(),
            })
          }
        }
      }
    } catch (error) {
      console.error('KML parsing error:', error)
      throw new Error('Invalid KML file format')
    }

    return routes
  }

  private parseJSON(content: string): ImportedRoute[] {
    try {
      const data = JSON.parse(content)
      
      // Handle different JSON formats
      if (data.routes && Array.isArray(data.routes)) {
        // Our export format
        return data.routes.map((route: any) => ({
          name: route.name || `Imported Route`,
          coordinates: route.coordinates || route.snappedCoordinates || [],
          mode: route.mode || 'walking',
          createdAt: route.createdAt || new Date().toISOString(),
        }))
      } else if (Array.isArray(data)) {
        // Array of routes
        return data.map((route: any) => ({
          name: route.name || `Imported Route`,
          coordinates: route.coordinates || [],
          mode: route.mode || 'walking',
          createdAt: route.createdAt || new Date().toISOString(),
        }))
      } else if (data.coordinates && Array.isArray(data.coordinates)) {
        // Single route
        return [{
          name: data.name || 'Imported Route',
          coordinates: data.coordinates,
          mode: data.mode || 'walking',
          createdAt: data.createdAt || new Date().toISOString(),
        }]
      } else {
        throw new Error('Invalid JSON format')
      }
    } catch (error) {
      console.error('JSON parsing error:', error)
      throw new Error('Invalid JSON file format')
    }
  }

  private parseAuto(content: string): ImportedRoute[] {
    // Try to auto-detect format
    const lowerContent = content.toLowerCase()
    
    if (lowerContent.includes('<gpx')) {
      return this.parseGPX(content)
    } else if (lowerContent.includes('<kml')) {
      return this.parseKML(content)
    } else if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
      return this.parseJSON(content)
    } else {
      throw new Error('Unable to detect file format')
    }
  }

  validateRoute(route: ImportedRoute): boolean {
    return !!(
      route.name &&
      route.coordinates &&
      Array.isArray(route.coordinates) &&
      route.coordinates.length >= 2 &&
      route.coordinates.every(coord => 
        typeof coord.latitude === 'number' &&
        typeof coord.longitude === 'number' &&
        coord.latitude >= -90 && coord.latitude <= 90 &&
        coord.longitude >= -180 && coord.longitude <= 180
      )
    )
  }

  async validateAndCleanRoutes(routes: ImportedRoute[]): Promise<ImportedRoute[]> {
    const validRoutes: ImportedRoute[] = []
    const invalidRoutes: string[] = []

    for (let i = 0; i < routes.length; i++) {
      const route = routes[i]
      if (this.validateRoute(route)) {
        validRoutes.push(route)
      } else {
        invalidRoutes.push(route.name || `Route ${i + 1}`)
      }
    }

    if (invalidRoutes.length > 0) {
      console.warn('Invalid routes found:', invalidRoutes)
    }

    return validRoutes
  }
}

export const importService = new ImportService() 