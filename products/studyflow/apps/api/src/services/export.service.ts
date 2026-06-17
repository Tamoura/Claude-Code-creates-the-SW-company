import { DashboardRepository } from '../repositories/dashboard.repository';
import { AuthRepository } from '../repositories/auth.repository';
import { toSubjectView, SubjectView } from './subject.service';
import { toProgressEntryView, ProgressEntryView } from './goal.presenter';

export interface ExportView {
  exportedAt: string;
  student: { id: string; email: string };
  subjects: SubjectView[];
  selections: Array<{
    id: string;
    subjectId: string;
    term: string;
    prereqWarningAck: boolean;
    createdAt: Date;
  }>;
  goals: Array<{
    id: string;
    selectionId: string;
    title: string;
    metricType: string;
    target: number;
    cadence: string;
    dueDate: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
  progressEntries: ProgressEntryView[];
}

/**
 * JSON data export (US-12, FR-024, C-10). Returns ONLY the requesting student's
 * owned subjects, selections, goals, and progress entries (BR-004).
 */
export class ExportService {
  constructor(
    private readonly repo: DashboardRepository,
    private readonly authRepo: AuthRepository
  ) {}

  async export(studentId: string): Promise<ExportView> {
    const [student, subjects, selections, goals, entries] = await Promise.all([
      this.authRepo.findStudentById(studentId),
      this.repo.ownedSubjects(studentId),
      this.repo.allSelections(studentId),
      this.repo.allGoals(studentId),
      this.repo.allProgressEntries(studentId),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      student: { id: student!.id, email: student!.email },
      subjects: subjects.map(toSubjectView),
      selections: selections.map((s) => ({
        id: s.id,
        subjectId: s.subjectId,
        term: s.term,
        prereqWarningAck: s.prereqWarningAck,
        createdAt: s.createdAt,
      })),
      goals: goals.map((g) => ({
        id: g.id,
        selectionId: g.selectionId,
        title: g.title,
        metricType: g.metricType,
        target: Number(g.target),
        cadence: g.cadence,
        dueDate: g.dueDate.toISOString().slice(0, 10),
        status: g.status,
        createdAt: g.createdAt,
        updatedAt: g.updatedAt,
      })),
      progressEntries: entries.map(toProgressEntryView),
    };
  }
}
