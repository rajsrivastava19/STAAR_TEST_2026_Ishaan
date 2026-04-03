export type YearStatus = 'playable' | 'queued';

export type ManifestEntry = {
  year: number;
  slug: string;
  label: string;
  status: YearStatus;
  officialQuestionCount: number;
  playableQuestionCount?: number;
  generation: 'classic' | 'modern';
  description: string;
  dataFile?: string;
};

export type Manifest = {
  siteTitle: string;
  years: ManifestEntry[];
};

export type Option = {
  id: string;
  text?: string;
  imageUrl?: string;
  table?: {
    title?: string;
    headers?: string[];
    rows: (string | number)[][];
    orientation?: 'vertical' | 'horizontal';
  };
};

export type AnswerRule =
  | { kind: 'single_choice'; correct: string }
  | { kind: 'numeric_equivalent'; canonicalValue: string; acceptedValues: string[] }
  | { kind: 'multi_select'; correct: string[] }
  | { kind: 'drag_drop'; dropZones: Record<string, string>; options: string[]; sentenceTemplate?: string }
  | { kind: 'inline_choice'; blanks: { id: string; correct: string; options: string[] }[] };

export type Question = {
  id: string;
  itemNumber: number;
  itemType: 'multiple_choice' | 'griddable_numeric' | 'multi_select' | 'drag_drop' | 'inline_choice';
  stem: string;
  imageUrl?: string;
  table?: {
    title?: string;
    headers?: string[];
    rows: (string | number)[][];
    orientation?: 'vertical' | 'horizontal';
  };
  directions?: string;
  optionsLayout?: 'grid_2col' | 'grid_2col_vertical';
  options?: Option[];
  answerRule: AnswerRule;
  metadata: {
    reportingCategory: number;
    readinessType: string;
    teks: string;
    maxPoints: number;
    isVoided?: boolean;
  };
  rationale: {
    correctExplanation: string;
    incorrectOptionExplanations?: Record<string, string>;
    remediationTip?: string;
  };
};

export type ExamBundle = {
  id: string;
  siteTitle: string;
  displayTitle: string;
  subtitle: string;
  year: number;
  grade: number;
  subject: string;
  generation: 'classic' | 'modern';
  totalQuestions: number;
  sourceFiles: string[];
  questions: Question[];
};

export type AttemptState = {
  answers: Record<string, string | string[] | Record<string, string>>;
  flagged: Record<string, boolean>;
  elapsedSeconds: number;
  timerEnabled: boolean;
};

export type ScoreBreakdown = {
  correct: number;
  total: number;
  percent: number;
};

