export type DeviceLocation = { lat: number; lng: number; accuracyM: number };

export function locateDevice(geolocation: Geolocation): Promise<DeviceLocation> {
  return new Promise((resolve, reject) => {
    geolocation.getCurrentPosition(position => {
      const { latitude: lat, longitude: lng, accuracy: accuracyM } = position.coords;
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
        reject(new Error('El dispositivo devolvió una ubicación inválida. Intenta de nuevo.'));
        return;
      }
      resolve({ lat, lng, accuracyM });
    }, error => {
      const messages: Record<number, string> = {
        1: 'No se permitió el acceso a tu ubicación. Actívalo en los permisos de este sitio para usar el GPS.',
        2: 'No se pudo obtener tu ubicación. Activa la ubicación del dispositivo e intenta de nuevo.',
        3: 'El dispositivo tardó demasiado en localizarte. Intenta de nuevo en un lugar con mejor señal.',
      };
      reject(new Error(messages[error.code] || 'No se pudo obtener tu ubicación. Intenta de nuevo.'));
    }, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
  });
}
