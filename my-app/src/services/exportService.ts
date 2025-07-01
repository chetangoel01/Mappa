import * as Sharing from 'expo-sharing'
import * as FileSystem from 'expo-file-system'
import { Platform } from 'react-native'

export interface Route {
  id: string
  name: string
  coordinates: Array<{ latitude: number; longitude: number }>
  createdAt: string
  snappedCoordinates?: Array<{ latitude: number; longitude: number }>
  mode?: string
}

export type ExportFormat = 'gpx' | 'kml' | 'json'

class ExportService {
  async exportRoutes(routes: Route[], format: ExportFormat): Promise<boolean> {
    try {
      let content: string
      let filename: string
      let mimeType: string

      switch (format) {
        case 'gpx':
          content = this.generateGPX(routes)
          filename = `routes_${new Date().toISOString().split('T')[0]}.gpx`
          mimeType = 'application/gpx+xml'
          break
        case 'kml':
          content = this.generateKML(routes)
          filename = `routes_${new Date().toISOString().split('T')[0]}.kml`
          mimeType = 'application/vnd.google-earth.kml+xml'
          break
        case 'json':
          content = this.generateJSON(routes)
          filename = `routes_${new Date().toISOString().split('T')[0]}.json`
          mimeType = 'application/json'
          break
        default:
          throw new Error(`Unsupported format: ${format}`)
      }

      // Create temporary file
      const fileUri = `${FileSystem.documentDirectory}${filename}`
      await FileSystem.writeAsStringAsync(fileUri, content, {
        encoding: FileSystem.EncodingType.UTF8,
      })

      // Share the file
      const isAvailable = await Sharing.isAvailableAsync()
      if (!isAvailable) {
        throw new Error('Sharing is not available on this device')
      }

      await Sharing.shareAsync(fileUri, {
        mimeType,
        dialogTitle: `Export Routes as ${format.toUpperCase()}`,
        UTI: this.getUTI(format),
      })

      // Clean up temporary file
      await FileSystem.deleteAsync(fileUri, { idempotent: true })

      return true
    } catch (error) {
      console.error(`Failed to export routes as ${format}:`, error)
      return false
    }
  }

  private generateGPX(routes: Route[]): string {
    let gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Mappa Route Tracker" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>Mappa Routes Export</name>
    <desc>Routes exported from Mappa Route Tracker</desc>
    <time>${new Date().toISOString()}</time>
  </metadata>`

    routes.forEach((route, index) => {
      const coordinates = route.snappedCoordinates || route.coordinates
      if (coordinates.length > 0) {
        gpx += `
  <trk>
    <name>${route.name || `Route ${route.id}`}</name>
    <desc>Route created on ${new Date(route.createdAt).toLocaleDateString()}</desc>
    <trkseg>`
        
        coordinates.forEach(coord => {
          gpx += `
      <trkpt lat="${coord.latitude}" lon="${coord.longitude}">
        <ele>0</ele>
      </trkpt>`
        })
        
        gpx += `
    </trkseg>
  </trk>`
      }
    })

    gpx += `
</gpx>`

    return gpx
  }

  private generateKML(routes: Route[]): string {
    let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Mappa Routes Export</name>
    <description>Routes exported from Mappa Route Tracker</description>`

    routes.forEach((route, index) => {
      const coordinates = route.snappedCoordinates || route.coordinates
      if (coordinates.length > 0) {
        kml += `
    <Placemark>
      <name>${route.name || `Route ${route.id}`}</name>
      <description>Route created on ${new Date(route.createdAt).toLocaleDateString()}</description>
      <LineString>
        <coordinates>`
        
        coordinates.forEach(coord => {
          kml += `
          ${coord.longitude},${coord.latitude},0`
        })
        
        kml += `
        </coordinates>
      </LineString>
    </Placemark>`
      }
    })

    kml += `
  </Document>
</kml>`

    return kml
  }

  private generateJSON(routes: Route[]): string {
    const exportData = {
      exportInfo: {
        app: 'Mappa Route Tracker',
        version: '1.0.0',
        exportDate: new Date().toISOString(),
        routeCount: routes.length,
      },
      routes: routes.map(route => ({
        id: route.id,
        name: route.name || `Route ${route.id}`,
        coordinates: route.coordinates,
        snappedCoordinates: route.snappedCoordinates,
        createdAt: route.createdAt,
        mode: route.mode || 'walking',
      })),
    }

    return JSON.stringify(exportData, null, 2)
  }

  private getUTI(format: ExportFormat): string {
    switch (format) {
      case 'gpx':
        return 'com.topografix.gpx'
      case 'kml':
        return 'com.google.earth.kml'
      case 'json':
        return 'public.json'
      default:
        return 'public.data'
    }
  }

  async exportSingleRoute(route: Route, format: ExportFormat): Promise<boolean> {
    return this.exportRoutes([route], format)
  }

  async exportRouteAsGPX(route: Route): Promise<string | null> {
    try {
      const gpx = this.generateGPX([route])
      return gpx
    } catch (error) {
      console.error('Failed to generate GPX:', error)
      return null
    }
  }

  async exportRouteAsKML(route: Route): Promise<string | null> {
    try {
      const kml = this.generateKML([route])
      return kml
    } catch (error) {
      console.error('Failed to generate KML:', error)
      return null
    }
  }
}

export const exportService = new ExportService() 