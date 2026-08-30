import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { PlanLimitService } from '../../core/services/plan-limit.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@Injectable()
export class BranchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly planLimitService: PlanLimitService,
  ) {}

  async findAll(companyId?: string) {
    return this.prisma.branch.findMany({
      where: companyId ? { companyId } : undefined,
      include: {
        teams: {
          include: {
            _count: { select: { projects: true } },
          },
        },
        company: { select: { id: true, legalName: true } },
      },
    });
  }

  async findOne(id: string, companyId?: string) {
    const branch = await this.prisma.branch.findFirst({
      where: {
        id,
        ...(companyId ? { companyId } : {}),
      },
      include: {
        teams: {
          include: {
            projects: true,
          },
        },
        company: { select: { id: true, legalName: true } },
      },
    });
    if (!branch) throw new NotFoundException(`Branch ${id} not found`);
    return branch;
  }

  async create(dto: CreateBranchDto, companyId: string) {
    await this.planLimitService.checkBranchLimit(companyId);

    return this.prisma.branch.create({
      data: {
        name: dto.name,
        companyId,
      },
    });
  }

  async update(id: string, dto: UpdateBranchDto, companyId?: string) {
    await this.findOne(id, companyId);
    return this.prisma.branch.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, companyId?: string) {
    await this.findOne(id, companyId);
    await this.prisma.branch.delete({ where: { id } });
    return { message: 'Branch deleted successfully' };
  }
}
