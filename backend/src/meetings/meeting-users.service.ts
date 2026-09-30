import { ConflictException, Injectable, InternalServerErrorException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../common/prisma/prisma.service';
import { ROLE_CODES } from '../common/constants/roles.constant';
import { CreateMeetingUserDto } from './dto/meeting-user.dto';

const SELECT = { id: true, fullName: true, email: true, active: true, createdAt: true };

// Usuarios del perfil Reuniones. El perfil Reuniones puede darlos de alta, pero solo con
// ese rol: el rol se fija aca y nunca se toma del request.
@Injectable()
export class MeetingUsersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({
      where: { role: { code: ROLE_CODES.REUNIONES } },
      select: SELECT,
      orderBy: { fullName: 'asc' },
    });
  }

  async create(dto: CreateMeetingUserDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Ya existe un usuario con ese email');
    }
    const role = await this.prisma.role.findUnique({ where: { code: ROLE_CODES.REUNIONES } });
    if (!role) {
      throw new InternalServerErrorException('No existe el rol Reuniones');
    }
    return this.prisma.user.create({
      data: {
        email,
        fullName: dto.fullName.trim(),
        passwordHash: await bcrypt.hash(dto.password, 10),
        roleId: role.id,
        active: true,
      },
      select: SELECT,
    });
  }
}
