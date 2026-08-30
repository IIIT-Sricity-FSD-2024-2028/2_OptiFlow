import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { AttachmentsService } from './attachments.service';
import { CreateAttachmentDto } from './dto/create-attachment.dto';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { CompanyId } from '../../core/decorators/company-id.decorator';
import { ActorUserId } from '../../core/decorators/actor-user.decorators';
import { ApiTags, ApiOperation, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';

@ApiTags('Attachments')
@Controller('attachments')
@UseGuards(RolesGuard)
export class AttachmentsController {
  constructor(private readonly svc: AttachmentsService) {}

  @Get()
  @Roles(
    'superuser',
    'hr_manager',
    'project_manager',
    'team_leader',
    'team_member',
    'compliance_officer',
  )
  @ApiQuery({ name: 'entityType', required: false })
  @ApiQuery({ name: 'entityId', required: false })
  @ApiOperation({ summary: 'List attachments' })
  findAll(
    @CompanyId() companyId: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
  ) {
    return this.svc.findAll(companyId, entityType, entityId);
  }

  @Get(':id')
  @Roles(
    'superuser',
    'hr_manager',
    'project_manager',
    'team_leader',
    'team_member',
    'compliance_officer',
  )
  @ApiOperation({ summary: 'Get an attachment' })
  findOne(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.svc.findOne(id);
  }

  @Post()
  @Roles(
    'superuser',
    'hr_manager',
    'project_manager',
    'team_leader',
    'team_member',
    'compliance_officer',
  )
  @ApiOperation({ summary: 'Create an attachment' })
  create(
    @Body() dto: CreateAttachmentDto,
    @CompanyId() companyId: string,
    @ActorUserId() uploadedById: string,
  ) {
    return this.svc.create(dto, companyId, uploadedById);
  }

  @Post('upload')
  @Roles(
    'superuser',
    'hr_manager',
    'project_manager',
    'team_leader',
    'team_member',
    'compliance_officer',
  )
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const uploadDir = path.join(process.cwd(), 'uploads');
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          cb(null, uploadDir);
        },
        filename: (_req, file, cb) => {
          const uniqueName = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
          cb(null, uniqueName);
        },
      }),
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        entityType: { type: 'string', example: 'Task' },
        entityId: { type: 'string', example: 'task-uuid-1' },
      },
    },
  })
  @ApiOperation({ summary: 'Upload file attachment (real Multer upload)' })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('entityType') entityType: string,
    @Body('entityId') entityId: string,
    @CompanyId() companyId: string,
    @ActorUserId() uploadedById: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file attached. Include a "file" field in the body.');
    }

    const fileUrl = `/uploads/${file.filename}`;
    const attachment = await this.svc.create(
      {
        entityType: entityType || 'General',
        entityId: entityId || 'general',
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSizeBytes: file.size,
        fileUrl,
      },
      companyId,
      uploadedById ? String(uploadedById) : 'system',
    );

    return {
      message: 'Attachment uploaded successfully',
      attachment,
    };
  }

  @Delete(':id')
  @Roles(
    'superuser',
    'hr_manager',
    'project_manager',
    'team_leader',
    'team_member',
    'compliance_officer',
  )
  @ApiOperation({ summary: 'Delete an attachment' })
  remove(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.svc.remove(id);
  }
}
