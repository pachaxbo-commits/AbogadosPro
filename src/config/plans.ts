import { UserProfile } from '../types';

export const FREE_PLAN_LIMITS = {
  maxClients: 5,
  maxCases: 3,
} as const;

export interface PlanValidationResult {
  allowed: boolean;
  reason?: string;
  limit?: number;
  current?: number;
}

/**
 * Valida si un usuario con su perfil actual puede registrar un nuevo cliente.
 * El modo demo o usuarios con rol admin / trial no tienen restricciones del plan gratuito.
 */
export function canCreateClient(profile: UserProfile | null | undefined, currentCount: number): PlanValidationResult {
  if (!profile) {
    // Si no hay perfil (ej. modo demo), se permite sin restricción
    return { allowed: true };
  }

  if (profile.role === 'admin' || profile.billingExempt || profile.plan !== 'free') {
    return { allowed: true };
  }

  if (currentCount >= FREE_PLAN_LIMITS.maxClients) {
    return {
      allowed: false,
      reason: `Has alcanzado el límite de ${FREE_PLAN_LIMITS.maxClients} clientes de tu cuenta gratuita. Para registrar más clientes, actualiza tu plan o contacta a soporte.`,
      limit: FREE_PLAN_LIMITS.maxClients,
      current: currentCount,
    };
  }

  return { allowed: true, limit: FREE_PLAN_LIMITS.maxClients, current: currentCount };
}

/**
 * Valida si un usuario con su perfil actual puede registrar un nuevo caso.
 * El modo demo o usuarios con rol admin / trial no tienen restricciones del plan gratuito.
 */
export function canCreateCase(profile: UserProfile | null | undefined, currentCount: number): PlanValidationResult {
  if (!profile) {
    return { allowed: true };
  }

  if (profile.role === 'admin' || profile.billingExempt || profile.plan !== 'free') {
    return { allowed: true };
  }

  if (currentCount >= FREE_PLAN_LIMITS.maxCases) {
    return {
      allowed: false,
      reason: `Has alcanzado el límite de ${FREE_PLAN_LIMITS.maxCases} casos de tu cuenta gratuita. Para gestionar más casos, actualiza tu plan o contacta a soporte.`,
      limit: FREE_PLAN_LIMITS.maxCases,
      current: currentCount,
    };
  }

  return { allowed: true, limit: FREE_PLAN_LIMITS.maxCases, current: currentCount };
}
