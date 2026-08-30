import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreatePlatformAdminUserDto } from './dto/create-platform-admin-user.dto';
import { UpdatePlatformAdminUserDto } from './dto/update-platform-admin-user.dto';
import { PrismaService } from '../../core/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class PlatformAdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const admins = await this.prisma.platformAdminUser.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return admins.map((a) => ({
      id: a.id,
      fullName: a.fullName,
      username: a.fullName || a.email,
      email: a.email,
      isActive: a.isActive,
      createdAt: a.createdAt,
    }));
  }

  async findOne(id: string) {
    const admin = await this.prisma.platformAdminUser.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        email: true,
        isActive: true,
        createdAt: true,
        supportAccesses: {
          include: { company: true },
        },
      },
    });
    if (!admin)
      throw new NotFoundException(`PlatformAdminUser ${id} not found`);
    return {
      ...admin,
      username: admin.fullName || admin.email,
    };
  }

  async create(dto: CreatePlatformAdminUserDto) {
    const rawPassword = dto.password ?? dto.passwordHash;
    let passwordHash: string;
    if (rawPassword && !rawPassword.startsWith('$2')) {
      passwordHash = await bcrypt.hash(rawPassword, 10);
    } else if (rawPassword && rawPassword.startsWith('$2')) {
      passwordHash = rawPassword;
    } else {
      passwordHash = await bcrypt.hash('PlatformAdmin123!', 10);
    }

    const created = await this.prisma.platformAdminUser.create({
      data: {
        email: dto.email,
        fullName: dto.fullName,
        passwordHash,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        isActive: true,
        createdAt: true,
      },
    });

    return {
      ...created,
      username: created.fullName || created.email,
    };
  }

  async update(id: string, dto: UpdatePlatformAdminUserDto) {
    const existing = await this.findOne(id);

    if (dto.isActive === false && existing.isActive === true) {
      const activeCount = await this.prisma.platformAdminUser.count({
        where: { isActive: true },
      });
      if (activeCount <= 1) {
        throw new BadRequestException(
          'Cannot deactivate the last active platform administrator.',
        );
      }
    }

    const rawPassword = dto.password ?? dto.passwordHash;
    let passwordHash: string | undefined = undefined;
    if (rawPassword) {
      passwordHash = rawPassword.startsWith('$2')
        ? rawPassword
        : await bcrypt.hash(rawPassword, 10);
    }

    const updated = await this.prisma.platformAdminUser.update({
      where: { id },
      data: {
        ...(dto.email ? { email: dto.email } : {}),
        ...(dto.fullName ? { fullName: dto.fullName } : {}),
        ...(passwordHash ? { passwordHash } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        isActive: true,
        createdAt: true,
      },
    });

    return {
      ...updated,
      username: updated.fullName || updated.email,
    };
  }

  async remove(id: string) {
    await this.findOne(id);
    const count = await this.prisma.platformAdminUser.count();
    if (count <= 1) {
      throw new BadRequestException(
        'Cannot delete the last platform administrator.',
      );
    }
    await this.prisma.platformAdminUser.delete({ where: { id } });
    return { message: `PlatformAdminUser ${id} deleted successfully` };
  }
}
