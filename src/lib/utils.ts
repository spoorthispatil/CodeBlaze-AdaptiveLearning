import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function getMasteryColor(mastery: number): string {
  if (mastery >= 80) return 'text-emerald-600';
  if (mastery >= 60) return 'text-blue-600';
  if (mastery >= 40) return 'text-amber-600';
  return 'text-red-500';
}

export function getMasteryBg(mastery: number): string {
  if (mastery >= 80) return 'bg-emerald-500';
  if (mastery >= 60) return 'bg-blue-500';
  if (mastery >= 40) return 'bg-amber-400';
  return 'bg-red-400';
}

export function getMasteryLabel(mastery: number): string {
  if (mastery >= 80) return 'Mastered';
  if (mastery >= 60) return 'Proficient';
  if (mastery >= 40) return 'Learning';
  if (mastery > 0) return 'At Risk';
  return 'Not Started';
}
