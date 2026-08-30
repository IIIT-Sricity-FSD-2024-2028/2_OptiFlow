import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateComplianceCategoryDto } from './dto/create-compliance-category.dto';
import { UpdateComplianceCategoryDto } from './dto/update-compliance-category.dto';

@Injectable()
export class ComplianceCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId?: string) {
    return this.prisma.complianceCategory.findMany({
      where: companyId
        ? { OR: [{ companyId: null }, { companyId }] }
        : undefined,
      include: {
        owner: { select: { id: true, fullName: true, email: true } },
        rules: true,
      },
    });
  }

  async findOne(id: string, companyId?: string) {
    const category = await this.prisma.complianceCategory.findFirst({
      where: {
        id,
        ...(companyId ? { OR: [{ companyId: null }, { companyId }] } : {}),
      },
      include: {
        owner: { select: { id: true, fullName: true, email: true } },
        rules: true,
      },
    });
    if (!category)
      throw new NotFoundException(`ComplianceCategory ${id} not found`);
    return category;
  }

  async create(dto: CreateComplianceCategoryDto, companyId?: string) {
    return this.prisma.complianceCategory.create({
      data: {
        companyId: companyId ?? null,
        name: dto.name,
        description: dto.description ?? null,
        ownerId: dto.ownerId ?? null,
      },
      include: { owner: true },
    });
  }

  async update(
    id: string,
    dto: UpdateComplianceCategoryDto,
    companyId?: string,
  ) {
    await this.findOne(id, companyId);
    return this.prisma.complianceCategory.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string, companyId?: string) {
    await this.findOne(id, companyId);
    await this.prisma.complianceCategory.delete({ where: { id } });
    return { message: 'Compliance category deleted successfully' };
  }
}
