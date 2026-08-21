import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { SupportService } from './support.service';
import { CreateSupportRequestDto } from './dto/create-support-request.dto';
import { UpdateSupportRequestDto } from './dto/update-support-request.dto';
import { CreateReplyDto } from './dto/create-reply.dto';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';

/** Roles that are allowed to file a support request */
const REQUESTER_ROLES = [
  'team_member',
  'team_leader',
  'project_manager',
  'compliance_officer',
  'hr_manager',
  'hr_ops',
];

/** RM + superuser can manage the queue */
const RM_ROLES = ['relationship_manager', 'superuser'];

/** Everyone logged in can read FAQs */
const ALL_ROLES = [...REQUESTER_ROLES, ...RM_ROLES];

@ApiTags('Support')
@Controller('support')
@UseGuards(RolesGuard)
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  // ─── Support Requests ───────────────────────────────────────────────────────

  @Post()
  @Roles(...REQUESTER_ROLES)
  @ApiOperation({ summary: 'Submit a new support request' })
  createRequest(@Body() dto: CreateSupportRequestDto, @Req() req: any) {
    const userId: number = req.user?.user_id ?? req.user?.id ?? 0;
    return this.supportService.createRequest(dto, userId);
  }

  @Get('queue')
  @Roles(...RM_ROLES)
  @ApiOperation({ summary: 'RM queue — all non-closed tickets' })
  findQueue() {
    return this.supportService.findQueue();
  }

  @Get('mine')
  @Roles(...REQUESTER_ROLES)
  @ApiOperation({ summary: 'Requester history — all my tickets' })
  findMine(@Req() req: any) {
    const userId: number = req.user?.user_id ?? req.user?.id ?? 0;
    return this.supportService.findByRequester(userId);
  }

  @Get('reports/summary')
  @Roles(...RM_ROLES)
  @ApiOperation({ summary: 'Support reporting summary (RM + superuser)' })
  getReportSummary() {
    return this.supportService.getReportSummary();
  }

  @Get(':id')
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Get a single support ticket' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.supportService.findOne(id);
  }

  @Patch(':id/assign')
  @Roles(...RM_ROLES)
  @ApiOperation({ summary: 'Assign ticket to an RM team member' })
  assign(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { assignee_id: number },
    @Req() req: any,
  ) {
    const actorId: number = req.user?.user_id ?? req.user?.id ?? 0;
    return this.supportService.assign(id, body.assignee_id, actorId);
  }

  @Patch(':id/resolve')
  @Roles(...RM_ROLES)
  @ApiOperation({ summary: 'Mark a ticket as resolved (RM only)' })
  resolve(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const actorId: number = req.user?.user_id ?? req.user?.id ?? 0;
    return this.supportService.resolve(id, actorId);
  }

  @Post(':id/reopen')
  @Roles(...RM_ROLES)
  @ApiOperation({ summary: 'Reopen a resolved or closed ticket (RM only)' })
  reopen(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const actorId: number = req.user?.user_id ?? req.user?.id ?? 0;
    return this.supportService.reopen(id, actorId);
  }

  // ─── Replies ────────────────────────────────────────────────────────────────

  @Get(':id/replies')
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Get replies for a ticket' })
  findReplies(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const role: string = req.user?.role ?? '';
    const isRm = RM_ROLES.includes(role);
    return this.supportService.findReplies(id, isRm);
  }

  @Post(':id/replies')
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Add a reply to a ticket' })
  addReply(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateReplyDto,
    @Req() req: any,
  ) {
    const userId: number = req.user?.user_id ?? req.user?.id ?? 0;
    const role: string = req.user?.role ?? '';
    const isRm = RM_ROLES.includes(role);
    return this.supportService.addReply(id, dto, userId, isRm);
  }

  // ─── Attachments ────────────────────────────────────────────────────────────

  @Get(':id/attachments')
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Get attachments for a ticket' })
  findAttachments(@Param('id', ParseIntPipe) id: number) {
    return this.supportService.findAttachments(id);
  }

  @Get(':id/attachments/total')
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Get total attachment bytes for a ticket (for 10 MB client-side validation)' })
  getAttachmentTotal(@Param('id', ParseIntPipe) id: number) {
    return { total_bytes: this.supportService.getAttachmentTotal(id) };
  }

  @Post(':id/attachments')
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Add an attachment to a ticket (enforces 10 MB total cap)' })
  addAttachment(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      file_name: string;
      file_type: string | null;
      file_size_bytes: number;
    },
    @Req() req: any,
  ) {
    const userId: number = req.user?.user_id ?? req.user?.id ?? 0;
    return this.supportService.addAttachment(
      id,
      body.file_name,
      body.file_type,
      body.file_size_bytes,
      userId,
    );
  }

  // ─── FAQs ───────────────────────────────────────────────────────────────────

  @Get('faqs')
  @Roles(...ALL_ROLES)
  @ApiOperation({ summary: 'Get active FAQs (optionally filtered by category or query)' })
  findFaqs(
    @Query('category') category?: string,
    @Query('q') query?: string,
  ) {
    return this.supportService.findFaqs(category, query);
  }

  @Post('faqs')
  @Roles(...RM_ROLES)
  @ApiOperation({ summary: 'Create a new FAQ entry (RM only)' })
  createFaq(@Body() dto: CreateFaqDto, @Req() req: any) {
    const actorId: number = req.user?.user_id ?? req.user?.id ?? 0;
    return this.supportService.createFaq(dto, actorId);
  }

  @Patch('faqs/:id')
  @Roles(...RM_ROLES)
  @ApiOperation({ summary: 'Update a FAQ entry (RM only)' })
  updateFaq(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFaqDto,
    @Req() req: any,
  ) {
    const actorId: number = req.user?.user_id ?? req.user?.id ?? 0;
    return this.supportService.updateFaq(id, dto, actorId);
  }

  @Delete('faqs/:id')
  @Roles(...RM_ROLES)
  @ApiOperation({ summary: 'Delete a FAQ entry (RM only)' })
  removeFaq(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const actorId: number = req.user?.user_id ?? req.user?.id ?? 0;
    return this.supportService.removeFaq(id, actorId);
  }
}
