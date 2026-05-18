import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

type UploadedPhoto = {
  path: string;
  signedUrl: string | null;
  contentType: string;
  sizeBytes: number;
};

@Injectable()
export class OrdersStorageService {
  private readonly bucket: string;
  private readonly client: SupabaseClient | null;

  constructor(config: ConfigService) {
    this.bucket = config.get<string>('SUPABASE_STORAGE_BUCKET') ?? 'order-odometer';
    const supabaseUrl = config.get<string>('SUPABASE_URL');
    const serviceRoleKey =
      config.get<string>('SUPABASE_SERVICE_ROLE_KEY') ?? config.get<string>('SUPABASE_SECRET_KEY');

    this.client =
      supabaseUrl && serviceRoleKey
        ? createClient(supabaseUrl, serviceRoleKey, {
            auth: { persistSession: false },
          })
        : null;
  }

  async uploadOdometerPhoto(params: {
    companyId: string;
    orderId: string;
    userId: string;
    stage: 'start' | 'finish';
    base64: string;
    contentType?: string;
  }): Promise<UploadedPhoto> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'Supabase Storage nao configurado. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY ou SUPABASE_SECRET_KEY na API.',
      );
    }

    // Cria/garante o bucket de forma resiliente e autônoma
    try {
      await this.client.storage.createBucket(this.bucket, {
        public: false,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
        fileSizeLimit: 5 * 1024 * 1024,
      });
    } catch {
      // Ignora erro se o bucket já existe ou há restrição de permissão simples
    }

    const contentType = this.normalizeContentType(this.detectContentType(params.base64) ?? params.contentType ?? '');
    const extension = this.extensionFromContentType(contentType);
    const path = this.buildPhotoPath(params, extension);
    const buffer = Buffer.from(this.cleanBase64(params.base64), 'base64');

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(contentType)) {
      throw new BadRequestException('Formato de foto do odometro nao permitido.');
    }

    if (buffer.length === 0) {
      throw new BadRequestException('Foto do odometro invalida.');
    }

    if (buffer.length > 5 * 1024 * 1024) {
      throw new BadRequestException('Foto do odometro deve ter no maximo 5 MB.');
    }

    const { error } = await this.client.storage.from(this.bucket).upload(path, buffer, {
      contentType,
      upsert: false,
    });

    if (error) {
      throw new ServiceUnavailableException(`Falha ao enviar foto para o Supabase Storage: ${error.message}`);
    }

    return {
      path,
      signedUrl: await this.createSignedUrl(path),
      contentType,
      sizeBytes: buffer.length,
    };
  }

  async createSignedUrl(path?: string | null) {
    if (!path || !this.client) {
      return null;
    }

    const { data, error } = await this.client.storage.from(this.bucket).createSignedUrl(path, 60 * 60);
    return error ? null : data.signedUrl;
  }

  private cleanBase64(value: string) {
    return value.includes(',') ? value.split(',').at(-1) ?? '' : value;
  }

  private detectContentType(value: string) {
    const cleaned = this.cleanBase64(value);
    const header = cleaned.substring(0, 16);

    if (header.startsWith('/9j/')) {
      return 'image/jpeg';
    }

    if (header.startsWith('iVBORw0KGgo')) {
      return 'image/png';
    }

    if (header.startsWith('UklGR')) {
      return 'image/webp';
    }

    return null;
  }

  private normalizeContentType(value: string) {
    return value.split(';')[0].trim().toLowerCase();
  }

  private extensionFromContentType(contentType: string) {
    if (contentType.includes('png')) {
      return 'png';
    }

    if (contentType.includes('webp')) {
      return 'webp';
    }

    return 'jpg';
  }

  private buildPhotoPath(
    params: { companyId: string; orderId: string; userId: string; stage: 'start' | 'finish' },
    extension: string,
  ) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `odometer/${params.companyId}/${params.userId}/${params.orderId}/${params.stage}-${timestamp}-${randomUUID()}.${extension}`;
  }
}
