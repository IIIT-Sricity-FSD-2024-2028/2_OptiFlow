import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { EvidenceService } from './evidence.service';
import { CreateEvidenceDto } from './dto/create-evidence.dto';
import { UpdateEvidenceDto } from './dto/update-evidence.dto';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { CompanyId } from '../../core/decorators/company-id.decorator';
import { ActorUserId } from '../../core/decorators/actor-user.decorators';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody, ApiHeader } from '@nestjs/swagger';

@ApiTags('Evidence')
@Controller('evidence')
@UseGuards(RolesGuard)
export class EvidenceController {
  constructor(private readonly evidenceService: EvidenceService) {}

  @Get()
  @Roles(
    'guest',
    'superuser',
    'compliance_officer',
    'project_manager',
    'hr_manager',
    'team_leader',
    'team_member',
  )
  @ApiOperation({ summary: 'Get all evidence' })
  @ApiResponse({ status: 200, description: 'Successful operation.' })
  findAll(@CompanyId() companyId: string) {
    return this.evidenceService.findAll(companyId);
  }

  @Get(':id')
  @Roles(
    'guest',
    'superuser',
    'compliance_officer',
    'project_manager',
    'hr_manager',
    'team_leader',
    'team_member',
  )
  @ApiOperation({ summary: 'Get evidence by ID' })
  @ApiResponse({ status: 200, description: 'Successful operation.' })
  findOne(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.evidenceService.findOne(id, companyId);
  }

  @Post()
  @Roles('superuser', 'compliance_officer', 'project_manager', 'team_leader', 'team_member')
  @ApiOperation({ summary: 'Submit new evidence' })
  @ApiResponse({ status: 201, description: 'Successfully created.' })
  create(
    @Body() createEvidenceDto: CreateEvidenceDto,
    @CompanyId() companyId: string,
  ) {
    return this.evidenceService.create(createEvidenceDto, companyId);
  }

  @Patch(':id')
  @Roles(
    'superuser',
    'compliance_officer',
    'project_manager',
    'team_leader',
    'team_member',
  )
  @ApiOperation({ summary: 'Update evidence status/content' })
  @ApiResponse({ status: 200, description: 'Successful operation.' })
  @ApiHeader({ name: 'x-user-id', required: false })
  update(
    @Param('id') id: string,
    @Body() updateEvidenceDto: UpdateEvidenceDto,
    @ActorUserId() actorUserId: any,
    @CompanyId() companyId: string,
  ) {
    return this.evidenceService.update(
      id,
      updateEvidenceDto,
      actorUserId ? String(actorUserId) : undefined,
    );
  }

  @Delete(':id')
  @Roles('superuser', 'compliance_officer', 'team_leader', 'team_member')
  @ApiOperation({ summary: 'Delete evidence' })
  @ApiResponse({ status: 200, description: 'Successful operation.' })
  remove(@Param('id') id: string, @CompanyId() companyId: string) {
    return this.evidenceService.remove(id, companyId);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // REAL FILE UPLOAD — POST /evidence/:id/upload
  // Uses NestJS's built-in FileInterceptor (Multer) as middleware.
  // Saves the physical file to ./uploads, creates an Attachment record linked to Company, and ties to ComplianceEvidence.
  // ─────────────────────────────────────────────────────────────────────────────
  @Post(':id/upload')
  @Roles('superuser', 'compliance_officer', 'project_manager', 'team_leader', 'team_member')
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
          // <timestamp>-<originalname> to avoid collisions
          const uniqueName = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
          cb(null, uniqueName);
        },
      }),
      limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB max
      fileFilter: (_req, file, cb) => {
        const allowed = [
          'application/pdf',
          'image/jpeg',
          'image/png',
          'image/webp',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/plain',
          'text/csv',
        ];
        if (allowed.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException(`Unsupported file type: ${file.mimetype}`), false);
        }
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary', description: 'Evidence file (PDF, DOCX, PNG, etc.)' },
        notes: { type: 'string', description: 'Optional notes about this upload' },
      },
    },
  })
  @ApiOperation({ summary: 'Upload a file to an evidence record (real Multer upload)' })
  @ApiResponse({ status: 201, description: 'File uploaded, Attachment created, and linked to evidence record.' })
  async uploadFile(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @ActorUserId() actorUserId: any,
    @CompanyId() companyId: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file attached. Include a "file" field in the multipart/form-data body.');
    }

    const result = await this.evidenceService.attachFile(
      id,
      file,
      companyId,
      actorUserId ? String(actorUserId) : undefined,
    );

    return {
      message: 'File uploaded successfully',
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      fileUrl: `/uploads/${file.filename}`,
      evidence: result.evidence,
      attachment: result.attachment,
    };
  }
}
