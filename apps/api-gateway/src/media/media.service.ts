import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import * as streamifier from 'streamifier';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(private configService: ConfigService) {
    const cloudinaryUrl = this.configService.get<string>('CLOUDINARY_URL');
    if (cloudinaryUrl) {
      process.env.CLOUDINARY_URL = cloudinaryUrl;
      cloudinary.config(true);
    } else {
      this.logger.warn('CLOUDINARY_URL is not set in environment variables');
    }
  }

  async uploadFile(file: any): Promise<string> {
    return this.uploadToFolder(file, 'servicehub');
  }

  async uploadViolationEvidence(file: any, serviceId: string): Promise<string> {
    return this.uploadToFolder(file, `ServiceHub/Violation/${serviceId}`);
  }

  private async uploadToFolder(file: any, folder: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) {
            this.logger.error('Failed to upload file to Cloudinary', error);
            return reject(error);
          }
          resolve(result.secure_url);
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }
}
