import type { Rating } from '@/types';

export const XP_FEEDBACK = {
  positive: [
    '✨ Excellent!',
    '🌟 Perfect!',
    '💪 Great job!',
    '🎯 Well done!',
    '⭐ Fantastic!',
  ],
  negative: [
    '💪 You will do better next time!',
    '📚 Keep practicing!',
    '🌱 Progress takes time!',
    '🔄 You\'re learning!',
    '💫 Keep going!',
  ],
} as const;

export function getRandomXPMessage(rating: Rating): string {
  const list = rating >= 3 ? XP_FEEDBACK.positive : XP_FEEDBACK.negative;
  return list[Math.floor(Math.random() * list.length)];
}
