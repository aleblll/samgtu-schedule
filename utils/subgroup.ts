import { Lesson } from '../types';

/**
 * Returns:
 * - 1: if lesson is explicitly for the 1st subgroup
 * - 2: if lesson is explicitly for the 2nd subgroup
 * - 0: if lesson is for the entire group (or unspecified)
 */
export function getLessonSubgroup(lesson: Partial<Lesson>): 0 | 1 | 2 {
  if (lesson.subgroup === 1) return 1;
  if (lesson.subgroup === 2) return 2;

  const combined = `${lesson.note || ''} ${lesson.subject || ''} ${lesson.groups || ''}`.toLowerCase();

  // Pattern 1: explicit 1st subgroup mentions
  // e.g., "1 п/г", "1 пг", "1-я п/г", "1-я подгруппа", "1 подгруппа", "подгруппа 1"
  if (/(?:^|[^\dа-яёa-z])(?:1\s*[-–—]?(?:я|ая)?\s*(?:п\/?г|подгрупп[а-яё]*)|подгрупп[а-яё]*\s*1)(?:$|[^\dа-яёa-z])/iu.test(combined)) {
    return 1;
  }

  // Pattern 2: explicit 2nd subgroup mentions
  // e.g., "2 п/г", "2 пг", "2-я п/г", "2-я подгруппа", "2 подгруппа", "подгруппа 2"
  if (/(?:^|[^\dа-яёa-z])(?:2\s*[-–—]?(?:я|ая)?\s*(?:п\/?г|подгрупп[а-яё]*)|подгрупп[а-яё]*\s*2)(?:$|[^\dа-яёa-z])/iu.test(combined)) {
    return 2;
  }

  // Pattern 3: group name with parenthetical subgroup e.g. "3-ИНГТ-110 (1)" or "24ИНГТ-110(2)"
  const groupMatch = (lesson.groups || '').match(/[\(\[]\s*([12])\s*[\)\]]/);
  if (groupMatch) {
    return parseInt(groupMatch[1], 10) as 1 | 2;
  }

  return 0;
}

/**
 * Checks whether a lesson should be visible given the selected subgroup filter.
 * - selectedSubgroup === 0: All lessons visible
 * - selectedSubgroup === 1: Whole group lessons + 1st subgroup lessons
 * - selectedSubgroup === 2: Whole group lessons + 2nd subgroup lessons
 */
export function matchesSubgroup(lesson: Partial<Lesson>, selectedSubgroup: number): boolean {
  if (!selectedSubgroup || selectedSubgroup === 0) return true;
  const sg = getLessonSubgroup(lesson);
  // Shared/general lessons are attended by both subgroups
  if (sg === 0) return true;
  // Specific subgroup lessons only shown if matching
  return sg === selectedSubgroup;
}
