import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marca un endpoint como accesible sin JWT (ej: login, refresh, health).
 * Sin este decorador, JwtAuthGuard exige un access token valido.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
