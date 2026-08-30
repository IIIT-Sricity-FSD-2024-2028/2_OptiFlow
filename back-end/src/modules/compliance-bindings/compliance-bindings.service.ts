import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateComplianceBindingDto } from './dto/create-compliance-binding.dto';

@Injectable()
export class ComplianceBindingsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId?: string, ruleId?: string) {
    return this.prisma.complianceBinding.findMany({
      where: {
        ...(ruleId ? { ruleId } : {}),
      },
      include: {
        rule: true,
      },
    });
  }

  async findOne(id: string) {
    const binding = await this.prisma.complianceBinding.findUnique({
      where: { id },
      include: { rule: true },
    });
    if (!binding)
      throw new NotFoundException(`ComplianceBinding ${id} not found`);
    return binding;
  }

  async create(dto: CreateComplianceBindingDto) {
    return this.prisma.complianceBinding.create({
      data: {
        ruleId: dto.ruleId,
        scopeType: dto.scopeType as any,
        scopeId: dto.scopeId,
      },
      include: { rule: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.complianceBinding.delete({ where: { id } });
    return { message: 'Compliance binding deleted successfully' };
  }
}
