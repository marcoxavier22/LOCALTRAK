import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GOOGLE_MAPS_API_KEY') || '';
    if (!this.apiKey) {
      this.logger.warn(
        'GOOGLE_MAPS_API_KEY não configurada no backend. Resolução de endereços funcionará apenas com fallback ou de forma manual.',
      );
    }
  }

  /**
   * Resolve um endereço de texto em coordenadas geográficas (latitude/longitude)
   * usando a Google Maps Geocoding API.
   */
  async geocode(address: string): Promise<{ latitude: number; longitude: number } | null> {
    if (!this.apiKey) {
      this.logger.warn('Geocoding solicitado, mas GOOGLE_MAPS_API_KEY está vazia.');
      return null;
    }

    if (!address || !address.trim()) {
      return null;
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        address.trim(),
      )}&key=${this.apiKey}`;

      const response = await fetch(url);
      if (!response.ok) {
        this.logger.error(`Erro ao chamar Google Geocoding API: Status ${response.status}`);
        return null;
      }

      const data = await response.json();

      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        this.logger.log(`Endereço resolvido com sucesso via Google Geocoding: "${address.trim()}" -> (${location.lat}, ${location.lng})`);
        return {
          latitude: Number(location.lat),
          longitude: Number(location.lng),
        };
      }

      this.logger.warn(`Google Geocoding retornou status: ${data.status} para o endereço: "${address}"`);
      return null;
    } catch (error) {
      this.logger.error(`Exceção durante Geocoding para o endereço "${address}":`, error);
      return null;
    }
  }
}
