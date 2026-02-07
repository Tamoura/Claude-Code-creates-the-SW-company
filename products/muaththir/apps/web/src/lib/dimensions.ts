/**
 * Dimension constants for Mu'aththir
 *
 * The six dimensions of child development. Colours and icons
 * are defined here and must be used consistently across all UI.
 */

export interface Dimension {
  name: string;
  slug: string;
  colour: string;
  /** Tailwind bg class for the dimension colour */
  bgClass: string;
  /** Tailwind text class for the dimension colour */
  textClass: string;
  /** Tailwind border class for the dimension colour */
  borderClass: string;
  /** Light background for cards */
  bgLightClass: string;
  icon: string;
  description: string;
}

export const DIMENSIONS: Dimension[] = [
  {
    name: 'Academic',
    slug: 'academic',
    colour: '#3B82F6',
    bgClass: 'bg-dimension-academic',
    textClass: 'text-dimension-academic',
    borderClass: 'border-dimension-academic',
    bgLightClass: 'bg-blue-50',
    icon: 'Book',
    description:
      'School and learning progress, grades, subject mastery, and curriculum milestones.',
  },
  {
    name: 'Social-Emotional',
    slug: 'social-emotional',
    colour: '#EC4899',
    bgClass: 'bg-dimension-social-emotional',
    textClass: 'text-dimension-social-emotional',
    borderClass: 'border-dimension-social-emotional',
    bgLightClass: 'bg-pink-50',
    icon: 'Heart',
    description:
      'Emotional intelligence, empathy, friendship skills, and conflict resolution.',
  },
  {
    name: 'Behavioural',
    slug: 'behavioural',
    colour: '#F59E0B',
    bgClass: 'bg-dimension-behavioural',
    textClass: 'text-dimension-behavioural',
    borderClass: 'border-dimension-behavioural',
    bgLightClass: 'bg-amber-50',
    icon: 'Shield',
    description:
      'Conduct, habits, discipline, self-regulation, and responsibility.',
  },
  {
    name: 'Aspirational',
    slug: 'aspirational',
    colour: '#8B5CF6',
    bgClass: 'bg-dimension-aspirational',
    textClass: 'text-dimension-aspirational',
    borderClass: 'border-dimension-aspirational',
    bgLightClass: 'bg-purple-50',
    icon: 'Star',
    description:
      'Goals, dreams, motivation, career exploration, and growth mindset.',
  },
  {
    name: 'Islamic',
    slug: 'islamic',
    colour: '#10B981',
    bgClass: 'bg-dimension-islamic',
    textClass: 'text-dimension-islamic',
    borderClass: 'border-dimension-islamic',
    bgLightClass: 'bg-emerald-50',
    icon: 'Moon',
    description:
      'Quran memorization, prayer habits, Islamic knowledge, and character (akhlaq).',
  },
  {
    name: 'Physical',
    slug: 'physical',
    colour: '#EF4444',
    bgClass: 'bg-dimension-physical',
    textClass: 'text-dimension-physical',
    borderClass: 'border-dimension-physical',
    bgLightClass: 'bg-red-50',
    icon: 'Activity',
    description:
      'Health metrics, fitness activities, motor skills, nutrition, and sleep.',
  },
];

export function getDimensionBySlug(slug: string): Dimension | undefined {
  return DIMENSIONS.find((d) => d.slug === slug);
}

export const DIMENSION_SLUGS = DIMENSIONS.map((d) => d.slug);
