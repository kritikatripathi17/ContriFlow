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

async function analyzeRepo(repoUrl: string) {
  const parsed = parseUrl(repoUrl ?? "");
  if (!parsed) return { error: "Invalid GitHub URL" };

  const { owner, repo } = parsed;
  const repoRes = await fetch(`${API}/repos/${owner}/${repo}`, { headers: headers() });

  if (repoRes.status === 404) return { error: "Repository not found" };
  if (!repoRes.ok) return { error: "GitHub API error" };

  const rd = await repoRes.json();

  const [issuesRes, contributorsRes, actionsRes] = await Promise.all([
    fetch(`${API}/repos/${owner}/${repo}/issues?state=open&per_page=100`, { headers: headers() }),
    fetch(`${API}/repos/${owner}/${repo}/contributors?per_page=100`, { headers: headers() }),
    fetch(`${API}/repos/${owner}/${repo}/actions/workflows`, { headers: headers() }),
  ]);

  const [issuesData, contributorsData, actionsData] = await Promise.all([
    issuesRes.ok ? issuesRes.json() : [],
    contributorsRes.ok ? contributorsRes.json() : [],
    actionsRes.ok ? actionsRes.json() : null,
  ]);

  const [readmeContent, hasContributing, hasCoC, hasIssueTemplate, hasPrTemplate, hasChangelog, hasSecurityPolicy] = await Promise.all([
    getFileContent(owner, repo, ["README.md", "readme.md", "README.rst", "README"]),
    fileExists(owner, repo, ["CONTRIBUTING.md", "contributing.md", ".github/CONTRIBUTING.md"]),
    fileExists(owner, repo, ["CODE_OF_CONDUCT.md", ".github/CODE_OF_CONDUCT.md"]),
    fileExists(owner, repo, [".github/ISSUE_TEMPLATE.md", ".github/ISSUE_TEMPLATE", ".github/issue_template.md"]),
    fileExists(owner, repo, [".github/PULL_REQUEST_TEMPLATE.md", ".github/pull_request_template.md"]),
    fileExists(owner, repo, ["CHANGELOG.md", "CHANGELOG", "HISTORY.md"]),
    fileExists(owner, repo, ["SECURITY.md", ".github/SECURITY.md"]),
  ]);

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

  const openIssues = Array.isArray(issuesData) ? issuesData.filter((i: { pull_request?: unknown }) => !i.pull_request).length : 0;
  const contributorCount = Array.isArray(contributorsData) ? contributorsData.length : 0;
  const hasCI = actionsData && actionsData.total_count > 0;
  const hasDescription = !!(rd.description && rd.description.trim().length > 10);
  const hasLicense = !!rd.license;
  const hasTopics = Array.isArray(rd.topics) && rd.topics.length > 0;
  const isActive = rd.pushed_at ? (Date.now() - new Date(rd.pushed_at).getTime()) < 1000 * 60 * 60 * 24 * 180 : false;

  const checks = [
    { id: "readme_quality", label: "README quality", passed: readmePass, score: readmeScore, maxScore: readmeMax, detail: readmeLen === 0 ? "No README found." : `README is ${readmeLen} chars. ${hasInstallSection ? "✓" : "✗"} Install. ${hasUsageSection ? "✓" : "✗"} Usage. ${hasBadges ? "✓" : "✗"} Badges.`, fixSuggestion: readmePass ? null : "Add installation steps, usage examples, and badges." },
    { id: "description", label: "Repository description", passed: hasDescription, score: hasDescription ? 8 : 0, maxScore: 8, detail: hasDescription ? `"${rd.description}"` : "No description set.", fixSuggestion: hasDescription ? null : "Add a short description on GitHub." },
    { id: "contributing", label: "CONTRIBUTING guide", passed: hasContributing, score: hasContributing ? 15 : 0, maxScore: 15, detail: hasContributing ? "CONTRIBUTING guide found." : "No CONTRIBUTING.md found.", fixSuggestion: hasContributing ? null : "Create CONTRIBUTING.md." },
    { id: "license", label: "Open source license", passed: hasLicense, score: hasLicense ? 8 : 0, maxScore: 8, detail: hasLicense ? `Licensed under ${rd.license.name}.` : "No license found.", fixSuggestion: hasLicense ? null : "Add a LICENSE file." },
    { id: "code_of_conduct", label: "Code of Conduct", passed: hasCoC, score: hasCoC ? 8 : 0, maxScore: 8, detail: hasCoC ? "Code of Conduct found." : "No Code of Conduct found.", fixSuggestion: hasCoC ? null : "Add CODE_OF_CONDUCT.md." },
    { id: "issue_template", label: "Issue templates", passed: hasIssueTemplate, score: hasIssueTemplate ? 8 : 0, maxScore: 8, detail: hasIssueTemplate ? "Issue templates found." : "No issue templates found.", fixSuggestion: hasIssueTemplate ? null : "Create .github/ISSUE_TEMPLATE/." },
    { id: "ci_cd", label: "CI/CD pipeline", passed: !!hasCI, score: hasCI ? 10 : 0, maxScore: 10, detail: hasCI ? `${actionsData.total_count} GitHub Actions workflow(s) found.` : "No GitHub Actions found.", fixSuggestion: hasCI ? null : "Add a GitHub Actions workflow." },
    { id: "changelog", label: "Changelog", passed: hasChangelog, score: hasChangelog ? 5 : 0, maxScore: 5, detail: hasChangelog ? "CHANGELOG found." : "No CHANGELOG found.", fixSuggestion: hasChangelog ? null : "Add a CHANGELOG.md." },
    { id: "security", label: "Security policy", passed: hasSecurityPolicy, score: hasSecurityPolicy ? 5 : 0, maxScore: 5, detail: hasSecurityPolicy ? "SECURITY.md found." : "No security policy found.", fixSuggestion: hasSecurityPolicy ? null : "Add SECURITY.md." },
    { id: "activity", label: "Recently active", passed: isActive, score: isActive ? 8 : 0, maxScore: 8, detail: `Last pushed: ${new Date(rd.pushed_at).toLocaleDateString()}.${isActive ? " Active in last 6 months." : " No activity in 6+ months."}`, fixSuggestion: isActive ? null : "Push updates regularly to signal active maintenance." },
  ];

  const totalScore = checks.reduce((s, c) => s + c.score, 0);
  const maxScore = checks.reduce((s, c) => s + c.maxScore, 0);

  return {
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
  };
}

export async function POST(request: Request) {
  try {
    const { repoUrl1, repoUrl2 } = await request.json();

    if (!repoUrl1 || !repoUrl2) {
      return NextResponse.json({ success: false, error: "Two repo URLs required" }, { status: 400 });
    }

    const [report1, report2] = await Promise.all([
      analyzeRepo(repoUrl1),
      analyzeRepo(repoUrl2),
    ]);

    if ("error" in report1) return NextResponse.json({ success: false, error: `Repo 1: ${report1.error}` }, { status: 400 });
    if ("error" in report2) return NextResponse.json({ success: false, error: `Repo 2: ${report2.error}` }, { status: 400 });

    return NextResponse.json({ success: true, report1, report2 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ success: false, error: "Something went wrong." }, { status: 500 });
  }
}