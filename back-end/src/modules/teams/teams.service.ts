import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(branchId?: string, companyId?: string) {
    return this.prisma.team.findMany({
      where: {
        ...(branchId ? { branchId } : {}),
        ...(companyId ? { branch: { companyId } } : {}),
      },
      include: {
        branch: { select: { id: true, name: true, companyId: true } },
        projects: true,
      },
    });
  }

  async findOne(id: string) {
    const team = await this.prisma.team.findUnique({
      where: { id },
      include: {
        branch: { select: { id: true, name: true, companyId: true } },
        projects: {
          include: {
            tasks: true,
          },
        },
      },
    });
    if (!team) throw new NotFoundException(`Team ${id} not found`);
    return team;
  }

  async create(dto: CreateTeamDto) {
    return this.prisma.team.create({
      data: {
        name: dto.team_name,
        branchId: dto.branchId,
      },
      include: {
        branch: true,
      },
    });
  }

  async update(id: string, dto: UpdateTeamDto) {
    await this.findOne(id);
    return this.prisma.team.update({
      where: { id },
      data: {
        ...(dto.team_name ? { name: dto.team_name } : {}),
        ...(dto.branchId ? { branchId: dto.branchId } : {}),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.team.delete({ where: { id } });
    return { message: 'Team deleted successfully' };
  }
}
