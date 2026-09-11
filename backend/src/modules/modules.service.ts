import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
// Se alias-ea a "ModuleModel" para no chocar con el decorador @Module() de @nestjs/common.
import { Module as ModuleModel } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';

interface ModuleTreeNode extends ModuleModel {
  children: ModuleTreeNode[];
}

@Injectable()
export class ModulesService {
  constructor(private readonly prisma: PrismaService) {}

  // Devuelve el arbol completo (padres con sus children ya anidados) ordenado por "order".
  // Para Fase 1, con pocos modulos, traer todo y armar el arbol en memoria es mas simple
  // y mas rapido de leer que resolverlo con queries recursivas en MySQL.
  async findTree(): Promise<ModuleTreeNode[]> {
    const all = await this.prisma.module.findMany({ orderBy: { order: 'asc' } });
    const byId = new Map<string, ModuleTreeNode>(all.map((m) => [m.id, { ...m, children: [] }]));
    const roots: ModuleTreeNode[] = [];

    for (const module of byId.values()) {
      if (module.parentId && byId.has(module.parentId)) {
        byId.get(module.parentId)!.children.push(module);
      } else {
        roots.push(module);
      }
    }
    return roots;
  }

  async findOne(id: string) {
    const module = await this.prisma.module.findUnique({ where: { id } });
    if (!module) {
      throw new NotFoundException('Modulo no encontrado');
    }
    return module;
  }

  async create(dto: CreateModuleDto, createdById: string) {
    const existing = await this.prisma.module.findUnique({ where: { slug: dto.slug } });
    if (existing) {
      throw new ConflictException('Ya existe un modulo con ese slug');
    }
    return this.prisma.module.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        parentId: dto.parentId,
        order: dto.order ?? 0,
        active: dto.active ?? true,
        createdById,
      },
    });
  }

  async update(id: string, dto: UpdateModuleDto) {
    await this.findOne(id);
    return this.prisma.module.update({ where: { id }, data: dto });
  }
}
