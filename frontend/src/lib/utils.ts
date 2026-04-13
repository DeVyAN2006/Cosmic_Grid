import { clsx, type ClassValue } from 'clsx';
import { twMerge }               from 'tailwind-merge';
import type { StormCategory, RiskLevel, StepCategory } from '../types';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

// ─── Color Maps ──────────────────────────────────────────────────────────────
export const STORM_COLORS: Record<StormCategory, string> = {
  None: '#10b981',
  G1:   '#84cc16',
  G2:   '#f59e0b',
  G3:   '#f97316',
  G4:   '#ef4444',
  G5:   '#dc2626',
};

export const RISK_COLORS: Record<RiskLevel, string> = {
  LOW:      '#10b981',   // green  — Safe (0–29)
  MEDIUM:   '#facc15',   // yellow — Low-Mod (30–49)
  HIGH:     '#f97316',   // orange — Moderate (50–74)
  CRITICAL: '#ef4444',   // red    — High (75–100)
};

// ─── Badge Styles ─────────────────────────────────────────────────────────────
export const STORM_BADGE_STYLES: Record<StormCategory, string> = {
  None: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  G1:   'bg-lime-500/10 text-lime-400 border-lime-500/30',
  G2:   'bg-amber-500/10 text-amber-400 border-amber-500/30',
  G3:   'bg-orange-500/10 text-orange-400 border-orange-500/30',
  G4:   'bg-red-500/10 text-red-400 border-red-500/30',
  G5:   'bg-rose-600/15 text-rose-400 border-rose-500/40',
};

export const RISK_BADGE_STYLES: Record<RiskLevel, string> = {
  LOW:      'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',   // green
  MEDIUM:   'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',      // yellow
  HIGH:     'bg-orange-500/10 text-orange-400 border-orange-500/30',      // orange
  CRITICAL: 'bg-red-500/10 text-red-400 border-red-500/30',              // red
};

export const STEP_ICONS: Record<StepCategory, string> = {
  PROTECTION: '🛡️',
  LOAD_SHED:  '⚡',
  ROUTING:    '🔀',
  ALERT:      '📢',
  MONITORING: '📡',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
export function getKpCategory(kp: number): StormCategory {
  if (kp < 5) return 'None';
  if (kp < 6) return 'G1';
  if (kp < 7) return 'G2';
  if (kp < 8) return 'G3';
  if (kp < 9) return 'G4';
  return 'G5';
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit',
  });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export function bzSeverity(bz: number): string {
  if (bz > 0)   return 'Northward';
  if (bz > -5)  return 'Weakly southward';
  if (bz > -10) return 'Moderately southward';
  if (bz > -20) return 'Strongly southward';
  return 'Extreme — high storm risk';
}