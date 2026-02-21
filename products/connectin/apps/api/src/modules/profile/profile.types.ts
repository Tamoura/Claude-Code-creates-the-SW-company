export interface ProfileResponse {
  id: string;
  userId: string;
  headlineAr: string | null;
  headlineEn: string | null;
  summaryAr: string | null;
  summaryEn: string | null;
  avatarUrl: string | null;
  location: string | null;
  website: string | null;
  completenessScore: number;
  experiences: ExperienceResponse[];
  skills: SkillResponse[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ExperienceResponse {
  id: string;
  company: string;
  title: string;
  location: string | null;
  description: string | null;
  startDate: Date;
  endDate: Date | null;
  isCurrent: boolean;
}

export interface SkillResponse {
  id: string;
  nameEn: string;
  nameAr: string | null;
  endorsementCount: number;
}
