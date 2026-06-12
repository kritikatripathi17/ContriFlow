export type Grade = "A" | "B" | "C" | "D" | "F";

export interface CheckResult {
  id: string;
  label: string;
  passed: boolean;
  score: number;
  maxScore: number;
  detail: string;
  fixSuggestion: string | null;
}

export interface RepoData {
  fullName: string;
  description: string | null;
  stars: number;
  forks: number;
  avatarUrl: string | null;
  htmlUrl: string;
  license: string | null;
}

export interface AnalysisReport {
  repoData: RepoData;
  checks: CheckResult[];
  totalScore: number;
  maxScore: number;
  grade: Grade;
  generatedAt: string;
}

export interface AnalyzeResponse {
  success: boolean;
  report?: AnalysisReport;
  error?: {
    code: string;
    message: string;
  };
}