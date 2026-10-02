export type TreeType = 'pine' | 'cherry' | 'maple' | 'palm' | 'bamboo';

export interface TreeStage {
  level: number;
  name: string;
  xpRequired: number;
  emoji: string;
}

export const TREE_STAGES: TreeStage[] = [
  { level: 0, name: 'Tohum', xpRequired: 0, emoji: '🌱' },
  { level: 1, name: 'Fidan', xpRequired: 300, emoji: '🌿' },
  { level: 2, name: 'Genç Ağaç', xpRequired: 900, emoji: '🌲' },
  { level: 3, name: 'Olgun Ağaç', xpRequired: 2100, emoji: '🌳' },
  { level: 4, name: 'Devasa Ağaç', xpRequired: 4500, emoji: '🏔️' },
];

export interface TreeTypeInfo {
  id: TreeType;
  name: string;
  emoji: string;
  description: string;
  unlockRequirement: number; // number of completed trees
  colors: { trunk: string; leaves: string; accent: string };
}

export const TREE_TYPES: TreeTypeInfo[] = [
  {
    id: 'pine',
    name: 'Çam',
    emoji: '🌲',
    description: 'Klasik ve güçlü',
    unlockRequirement: 0,
    colors: { trunk: '#8B4513', leaves: '#2D6A4F', accent: '#40916C' },
  },
  {
    id: 'cherry',
    name: 'Kiraz',
    emoji: '🌸',
    description: 'Pembe çiçekli, zarif',
    unlockRequirement: 5,
    colors: { trunk: '#6B3A2A', leaves: '#FFB7C5', accent: '#FF85A1' },
  },
  {
    id: 'maple',
    name: 'Akçaağaç',
    emoji: '🍁',
    description: 'Sonbahar renkleri',
    unlockRequirement: 10,
    colors: { trunk: '#7A4F2A', leaves: '#E07B39', accent: '#C1440E' },
  },
  {
    id: 'palm',
    name: 'Palmiye',
    emoji: '🌴',
    description: 'Tropikal rüya',
    unlockRequirement: 20,
    colors: { trunk: '#A0784A', leaves: '#4CAF50', accent: '#2E7D32' },
  },
  {
    id: 'bamboo',
    name: 'Bambu',
    emoji: '🎋',
    description: 'Minimalist ve huzurlu',
    unlockRequirement: 30,
    colors: { trunk: '#6B8E23', leaves: '#9ACD32', accent: '#556B2F' },
  },
];

export const XP_RULES = {
  pomodoroComplete: 150,
  freeTimerPerMinute: 5,
  taskComplete: 100,
  dailyStreakBonus: 50,
  goalComplete: 200,
  abandonPenalty: -50,
};

export function getLevelForXP(xp: number): number {
  let level = 0;
  for (let i = TREE_STAGES.length - 1; i >= 0; i--) {
    if (xp >= TREE_STAGES[i].xpRequired) {
      level = TREE_STAGES[i].level;
      break;
    }
  }
  return level;
}

export function getProgressToNextLevel(xp: number): number {
  const currentLevel = getLevelForXP(xp);
  if (currentLevel >= 4) return 1;
  const currentStage = TREE_STAGES[currentLevel];
  const nextStage = TREE_STAGES[currentLevel + 1];
  return (xp - currentStage.xpRequired) / (nextStage.xpRequired - currentStage.xpRequired);
}
