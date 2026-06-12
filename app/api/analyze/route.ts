import { NextResponse } from "next/server";

const API = "https://api.github.com";
const TOKEN = process.env.GITHUB_TOKEN ?? "";
const headers = () => ({
  Accept: "application/vnd.github+json",
  ...(TOKEN && { Authorization: `Bearer ${TOKEN}` }),
});

function parseUrl(url: string) {
  const m = url.trim().replace(/\/$/, "").match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!m) return null;
  return { owner: m[1], repo: m[2].replace(/\.git$/, "") };
}

function grade(score: number, max: number): "A" | "B" | "C" | "D" | "F" {
  const p = (score / max) * 100;
  if (p >= 85) return "A";
  if (p >= 70) return "B";
  if (p >= 55) return "C";
  if (p >= 40) return "D";
  return "F";
}

async function fileExists(owner: string, repo: string, paths: string[]) {
  for (const path of paths) {
    try {
      const r = await fetch(`${API}/repos/${owner}/${repo}/contents/${path}`, { headers: headers() });
      if (r.ok) return true;
    } catch { }
  }
  return false;
}

async function getFileContent(owner: string, repo: string, paths: string[]): Promise<string> {
  for (const path of paths) {
    try {
      const r = await fetch(`${API}/repos/${owner}/${repo}/contents/${path}`, { headers: headers() });
      if (r.ok) {
        const data = await r.json();
        if (data.content) return Buffer.from(data.content, "base64").toString("utf-8");
      }
    } catch { }
  }
  return "";
}

export async function POST(request: Request) {
  try {
    const { repoUrl } = await request.json();
    const parsed = parseUrl(repoUrl ?? "");
    if (!parsed) return NextResponse.json({ success: false, error: { code: "INVALID_URL", message: "Please enter a valid GitHub repository URL." } }, { status: 400 });

    const { owner, repo } = parsed;
    const repoRes = await fetch(`${API}/repos/${owner}/${repo}`, { headers: headers() });

    if (repoRes.status === 404) return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "Repository not found." } }, { status: 404 });
    if (repoRes.status === 403) return NextResponse.json({ success: false, error: { code: "RATE_LIMITED", message: "GitHub rate limit reached. Try again in a minute." } }, { status: 429 });
    if (!repoRes.ok) return NextResponse.json({ success: false, error: { code: "GITHUB_ERROR", message: "GitHub API error." } }, { status: 500 });

    const rd = await repoRes.json();

    const [issuesRes, contributorsRes, actionsRes, commitActivityRes, languagesRes, closedIssuesRes] = await Promise.all([
      fetch(`${API}/repos/${owner}/${repo}/issues?state=open&per_page=100`, { headers: headers() }),
      fetch(`${API}/repos/${owner}/${repo}/contributors?per_page=10`, { headers: headers() }),
      fetch(`${API}/repos/${owner}/${repo}/actions/workflows`, { headers: headers() }),
      fetch(`${API}/repos/${owner}/${repo}/stats/commit_activity`, { headers: headers() }),
      fetch(`${API}/repos/${owner}/${repo}/languages`, { headers: headers() }),
      fetch(`${API}/repos/${owner}/${repo}/issues?state=closed&per_page=50&sort=updated`, { headers: headers() }),
    ]);

    const [issuesData, contributorsData, actionsData, commitActivityData, languagesData, closedIssuesData] = await Promise.all([
      issuesRes.ok ? issuesRes.json() : [],
      contributorsRes.ok ? contributorsRes.json() : [],
      actionsRes.ok ? actionsRes.json() : null,
      commitActivityRes.ok ? commitActivityRes.json() : [],
      languagesRes.ok ? languagesRes.json() : {},
      closedIssuesRes.ok ? closedIssuesRes.json() : [],
    ]);

    const [readmeContent, hasContributing, hasCoC, hasIssueTemplate, hasChangelog, hasSecurityPolicy] = await Promise.all([
      getFileContent(owner, repo, ["README.md", "readme.md", "README.rst", "README"]),
      fileExists(owner, repo, ["CONTRIBUTING.md", "contributing.md", ".github/CONTRIBUTING.md"]),
      fileExists(owner, repo, ["CODE_OF_CONDUCT.md", ".github/CODE_OF_CONDUCT.md"]),
      fileExists(owner, repo, [".github/ISSUE_TEMPLATE.md", ".github/ISSUE_TEMPLATE", ".github/issue_template.md"]),
      fileExists(owner, repo, ["CHANGELOG.md", "CHANGELOG", "HISTORY.md"]),
      fileExists(owner, repo, ["SECURITY.md", ".github/SECURITY.md"]),
    ]);

    // README quality scoring
    const readmeLen = readmeContent.length;
    const hasInstallSection = /install|setup|getting started/i.test(readmeContent);
    const hasUsageSection = /usage|example|how to use/i.test(readmeContent);
    const hasBadges = /!\[.*?\]\(https?:\/\//i.test(readmeContent);
    const hasScreenshots = /!\[.*?\]\(.*?\.(png|jpg|gif|svg)/i.test(readmeContent);
    let readmeScore = 0;
    if (readmeLen > 0) readmeScore += 5;
    if (readmeLen > 500) readmeScore += 4;
    if (readmeLen > 2000) readmeScore += 3;
    if (hasInstallSection) readmeScore += 4;
    if (hasUsageSection) readmeScore += 3;
    if (hasBadges) readmeScore += 3;
    if (hasScreenshots) readmeScore += 3;
    const readmeMax = 25;
    const readmePass = readmeScore >= 15;

    const hasCI = actionsData && actionsData.total_count > 0;
    const hasDescription = !!(rd.description && rd.description.trim().length > 10);
    const hasLicense = !!rd.license;
    const isActive = rd.pushed_at ? (Date.now() - new Date(rd.pushed_at).getTime()) < 1000 * 60 * 60 * 24 * 180 : false;

    const checks = [
      { id: "readme_quality", label: "README quality", passed: readmePass, score: readmeScore, maxScore: readmeMax, detail: readmeLen === 0 ? "No README found." : `README is ${readmeLen} characters. ${hasInstallSection ? "✓" : "✗"} Install section. ${hasUsageSection ? "✓" : "✗"} Usage section. ${hasBadges ? "✓" : "✗"} Badges. ${hasScreenshots ? "✓" : "✗"} Screenshots.`, fixSuggestion: readmePass ? null : "Add installation steps, usage examples, badges, and screenshots to your README." },
      { id: "description", label: "Repository description", passed: hasDescription, score: hasDescription ? 8 : 0, maxScore: 8, detail: hasDescription ? `"${rd.description}"` : "No description set.", fixSuggestion: hasDescription ? null : "Add a short description on GitHub (click the gear icon next to About)." },
      { id: "contributing", label: "CONTRIBUTING guide", passed: hasContributing, score: hasContributing ? 15 : 0, maxScore: 15, detail: hasContributing ? "CONTRIBUTING guide found." : "No CONTRIBUTING.md found.", fixSuggestion: hasContributing ? null : "Create CONTRIBUTING.md explaining how to fork, branch, and submit a pull request." },
      { id: "license", label: "Open source license", passed: hasLicense, score: hasLicense ? 8 : 0, maxScore: 8, detail: hasLicense ? `Licensed under ${rd.license.name}.` : "No license found.", fixSuggestion: hasLicense ? null : "Add a LICENSE file. MIT or Apache 2.0 are popular choices." },
      { id: "code_of_conduct", label: "Code of Conduct", passed: hasCoC, score: hasCoC ? 8 : 0, maxScore: 8, detail: hasCoC ? "Code of Conduct found." : "No Code of Conduct found.", fixSuggestion: hasCoC ? null : "Add CODE_OF_CONDUCT.md — GitHub can generate one from the Insights tab." },
      { id: "issue_template", label: "Issue templates", passed: hasIssueTemplate, score: hasIssueTemplate ? 8 : 0, maxScore: 8, detail: hasIssueTemplate ? "Issue templates found." : "No issue templates found.", fixSuggestion: hasIssueTemplate ? null : "Create .github/ISSUE_TEMPLATE/ with bug report and feature request templates." },
      { id: "ci_cd", label: "CI/CD pipeline", passed: !!hasCI, score: hasCI ? 10 : 0, maxScore: 10, detail: hasCI ? `${actionsData.total_count} GitHub Actions workflow(s) found.` : "No GitHub Actions workflows found.", fixSuggestion: hasCI ? null : "Add a GitHub Actions workflow (.github/workflows/) to run automated tests on every PR." },
      { id: "changelog", label: "Changelog", passed: hasChangelog, score: hasChangelog ? 5 : 0, maxScore: 5, detail: hasChangelog ? "CHANGELOG found." : "No CHANGELOG found.", fixSuggestion: hasChangelog ? null : "Add a CHANGELOG.md to track what changes in each release." },
      { id: "security", label: "Security policy", passed: hasSecurityPolicy, score: hasSecurityPolicy ? 5 : 0, maxScore: 5, detail: hasSecurityPolicy ? "SECURITY.md found." : "No security policy found.", fixSuggestion: hasSecurityPolicy ? null : "Add SECURITY.md explaining how to report vulnerabilities." },
      { id: "activity", label: "Recently active", passed: isActive, score: isActive ? 8 : 0, maxScore: 8, detail: `Last pushed: ${new Date(rd.pushed_at).toLocaleDateString()}.${isActive ? " Active in last 6 months." : " No activity in 6+ months."}`, fixSuggestion: isActive ? null : "Push updates or triage issues regularly to signal active maintenance." },
    ];

    const totalScore = checks.reduce((s, c) => s + c.score, 0);
    const maxScore = checks.reduce((s, c) => s + c.maxScore, 0);

    // ── Language breakdown ─────────────────────────────────────────────────
    const langTotal = Object.values(languagesData as Record<string, number>).reduce((a: number, b: number) => a + b, 0);
    const languages = Object.entries(languagesData as Record<string, number>)
      .map(([name, bytes]) => ({ name, bytes, pct: Math.round((bytes / langTotal) * 100) }))
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, 8);

    // ── Commit activity (last 52 weeks) ────────────────────────────────────
    const commitActivity = Array.isArray(commitActivityData)
      ? commitActivityData.map((w: { week: number; total: number }) => ({ week: w.week, total: w.total }))
      : [];

    // ── Contributors ───────────────────────────────────────────────────────
    const contributors = Array.isArray(contributorsData)
      ? contributorsData.slice(0, 10).map((c: { login: string; avatar_url: string; contributions: number; html_url: string }) => ({
          login: c.login,
          avatarUrl: c.avatar_url,
          contributions: c.contributions,
          htmlUrl: c.html_url,
        }))
      : [];

    // ── Issue resolution time ──────────────────────────────────────────────
    let avgResolutionDays = null;
    if (Array.isArray(closedIssuesData) && closedIssuesData.length > 0) {
      const realIssues = closedIssuesData.filter((i: { pull_request?: unknown; created_at: string; closed_at: string }) => !i.pull_request && i.closed_at);
      if (realIssues.length > 0) {
        const totalMs = realIssues.reduce((sum: number, i: { created_at: string; closed_at: string }) => {
          return sum + (new Date(i.closed_at).getTime() - new Date(i.created_at).getTime());
        }, 0);
        avgResolutionDays = Math.round(totalMs / realIssues.length / (1000 * 60 * 60 * 24));
      }
    }

    // ── Contribution heatmap (last 52 weeks from commit activity) ──────────
    const heatmap = commitActivity.slice(-52).map((w) => ({
      week: w.week,
      count: w.total,
    }));

    return NextResponse.json({
      success: true,
      report: {
        repoData: {
          fullName: rd.full_name,
          description: rd.description ?? null,
          stars: rd.stargazers_count,
          forks: rd.forks_count,
          avatarUrl: rd.owner?.avatar_url ?? null,
          htmlUrl: rd.html_url,
          license: rd.license?.spdx_id ?? null,
        },
        checks,
        totalScore,
        maxScore,
        grade: grade(totalScore, maxScore),
        generatedAt: new Date().toISOString(),
        // ── New analytics data ──
        languages,
        commitActivity,
        contributors,
        avgResolutionDays,
        heatmap,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ success: false, error: { code: "SERVER_ERROR", message: "Something went wrong." } }, { status: 500 });
  }
}