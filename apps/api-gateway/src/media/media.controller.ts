import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  BadRequestException,
  Param,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '@app/common';
import { MediaService } from './media.service';

@Controller('api/media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard) // Đảm bảo chỉ người dùng đã đăng nhập mới được upload file
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: 5 * 1024 * 1024, // Giới hạn file 5MB
    },
  }))
  async uploadFile(@UploadedFile() file: any) {
    this.validateMediaFile(file);

    const fileUrl = await this.mediaService.uploadFile(file);
    return {
      url: fileUrl,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    };
  }

  @Post('violation/upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB for videos, 10MB for images
    },
  }))
  async uploadGenericViolationEvidence(@UploadedFile() file: any) {
    this.validateEvidenceFile(file);

    const fileUrl = await this.mediaService.uploadViolationEvidence(file, 'general');
    return {
      url: fileUrl,
      originalName: (file.originalname || 'evidence').replace(/[^a-zA-Z0-9._-]/g, '_'),
      mimeType: file.mimetype,
      size: file.size,
    };
  }

  @Post('violation/:serviceId/upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: 50 * 1024 * 1024,
    },
  }))
  async uploadViolationEvidence(
    @Param('serviceId') serviceId: string,
    @UploadedFile() file: any,
  ) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(serviceId)) {
      throw new BadRequestException('Invalid service id');
    }

    this.validateEvidenceFile(file);

    const fileUrl = await this.mediaService.uploadViolationEvidence(file, serviceId);
    return {
      url: fileUrl,
      originalName: (file.originalname || 'evidence').replace(/[^a-zA-Z0-9._-]/g, '_'),
      mimeType: file.mimetype,
      size: file.size,
    };
  }

  private validateEvidenceFile(file: any) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const ALLOWED_IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp'];
    const ALLOWED_VIDEO_EXTS = ['.mp4', '.mov', '.webm', '.m4v'];

    const extMatch = (file.originalname || '').toLowerCase().match(/\.[a-z0-9]+$/);
    const ext = extMatch ? extMatch[0] : '';
    const isImageExt = ALLOWED_IMAGE_EXTS.includes(ext);
    const isVideoExt = ALLOWED_VIDEO_EXTS.includes(ext);

    // Explicitly reject SVG to prevent Stored XSS via inline scripts
    const isImageMime = file.mimetype?.startsWith('image/') && !file.mimetype.includes('svg');
    const isVideoMime = file.mimetype?.startsWith('video/');

    if (!((isImageExt && isImageMime) || (isVideoExt && isVideoMime))) {
      throw new BadRequestException(
        'Định dạng file không hợp lệ. Chỉ chấp nhận ảnh (JPG, PNG, WEBP) hoặc video (MP4, MOV, WEBM).',
      );
    }

    // Size limits: Images max 10MB, Videos max 50MB
    const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
    const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

    if (isImageExt && file.size > MAX_IMAGE_SIZE) {
      throw new BadRequestException('Dung lượng hình ảnh vượt quá giới hạn 10MB');
    }
    if (isVideoExt && file.size > MAX_VIDEO_SIZE) {
      throw new BadRequestException('Dung lượng video vượt quá giới hạn 50MB');
    }
  }

  private validateMediaFile(file: any) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn file tải lên');
    }

    const ALLOWED_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
    const ALLOWED_MIMES = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
    ];

    const extMatch = (file.originalname || '').toLowerCase().match(/\.[a-z0-9]+$/);
    const ext = extMatch ? extMatch[0] : '';

    // Explicitly reject SVG and HTML to prevent Stored XSS via inline scripts
    const isSvgOrHtml =
      file.mimetype?.includes('svg') ||
      file.mimetype?.includes('html') ||
      ext === '.svg' ||
      ext === '.html' ||
      ext === '.htm';

    if (isSvgOrHtml || !ALLOWED_EXTS.includes(ext) || !ALLOWED_MIMES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Định dạng file không hợp lệ. Chỉ chấp nhận tài liệu PDF hoặc ảnh (JPG, PNG, WEBP).',
      );
    }

    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
      throw new BadRequestException('Dung lượng file vượt quá giới hạn cho phép (5MB)');
    }
  }
}
