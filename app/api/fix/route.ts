import { NextRequest, NextResponse } from "next/server";

const GROQ_API_KEY = process.env.GROQ_API_KEY!;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

const PROMPTS: Record<string, string> = {
  readme: `You are a helpful developer assistant. Generate a professional, ready-to-use README.md template for a GitHub repository called "{repoName}".

Include these sections with real placeholder content (not just section names):
- Project title with a one-line description
- Badges row (build, license, version)
- Features (3-4 bullet points)
- Installation (code blocks with npm/pip commands)
- Usage (a short code example)
- Contributing (link to CONTRIBUTING.md)
- License

Make it look professional and complete. Use markdown formatting.`,

  description: `You are a helpful developer assistant. Write 3 different short GitHub repository description options for a repo called "{repoName}".

Each should be:
- Under 100 characters
- Clear and descriptive
- No emojis
- Professional tone

Format as:
Option 1: ...
Option 2: ...
Option 3: ...

Then explain which one you recommend and why.`,

  contributing: `You are a helpful developer assistant. Generate a complete CONTRIBUTING.md file for a GitHub repository called "{repoName}".

Include:
- Welcome message
- Code of Conduct reference
- How to report bugs (with issue template guidance)
- How to suggest features
- Development setup (fork, clone, install, branch, commit, PR steps)
- Code style guidelines
- Pull request checklist
- Getting help

Make it warm, welcoming, and detailed. Use markdown formatting.`,

  license: `You are a helpful developer assistant. The GitHub repository "{repoName}" is missing an open source license.

Explain:
1. Why a license is important (2-3 sentences)
2. The 3 most common licenses (MIT, Apache 2.0, GPL-3.0) with a one-line explanation of each
3. Which one you recommend for most projects and why
4. The exact text to create a LICENSE file (use MIT as the recommendation, with year 2025 and placeholder [YOUR NAME])

Format clearly with headers.`,

  code_of_conduct: `You are a helpful developer assistant. Generate a complete CODE_OF_CONDUCT.md file for the GitHub repository "{repoName}".

Base it on the Contributor Covenant 2.1 standard. Include:
- Our Pledge
- Our Standards (positive and unacceptable behaviors)
- Enforcement Responsibilities
- Scope
- Enforcement steps
- Attribution

Make it professional and complete. Use markdown formatting.`,

  issue_templates: `You are a helpful developer assistant. Generate two GitHub issue templates for the repository "{repoName}":

1. Bug Report template (bug_report.md) — include: description, steps to reproduce, expected vs actual behavior, environment info, screenshots section
2. Feature Request template (feature_request.md) — include: problem description, proposed solution, alternatives considered, additional context

For each, show the full file content including the YAML front matter (name, about, labels, assignees).

Explain where to save these files: .github/ISSUE_TEMPLATE/`,

  pr_template: `You are a helpful developer assistant. Generate a complete Pull Request template for the GitHub repository "{repoName}".

Save as .github/PULL_REQUEST_TEMPLATE.md

Include:
- Description of changes
- Type of change checkboxes (bug fix, new feature, breaking change, docs)
- Testing checklist
- Screenshots (if applicable)
- Related issues (Closes #)
- Reviewer notes

Make it practical and easy to fill out.`,

  topics: `You are a helpful developer assistant. The GitHub repository "{repoName}" has no topics/tags set.

Explain:
1. Why topics matter for discoverability (2 sentences)
2. Suggest 8-10 relevant topics for a repo called "{repoName}" (comma separated, lowercase, no spaces — use hyphens)
3. Step-by-step instructions on how to add topics on GitHub (Settings → About section → gear icon → Topics field)

Keep it concise and actionable.`,

  recent_activity: `You are a helpful developer assistant. The GitHub repository "{repoName}" has not been updated in over 6 months.

Give practical advice:
1. Why activity matters for contributors (2-3 sentences)
2. Quick wins to show the repo is active (5 bullet points — like updating README, responding to issues, adding a CHANGELOG, etc.)
3. A sample "maintenance update" commit message they can use
4. How to set up GitHub Actions to auto-close stale issues (show the YAML config)

Keep it encouraging and actionable.`,

  open_issues: `You are a helpful developer assistant. The GitHub repository "{repoName}" has too many open issues without responses.

Give practical advice:
1. Why unresponded issues hurt contributor trust (2 sentences)
2. A triage strategy (5 steps)
3. Sample response templates for: (a) bug report acknowledgment, (b) feature request acknowledgment, (c) closing an old issue politely
4. How to use GitHub Labels to organize issues (suggest 6 useful label names with colors)

Keep it actionable and copy-paste ready.`,
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { checkId, checkLabel, repoName, detail } = body;

    if (!checkId || !repoName) {
      return NextResponse.json(
        { success: false, error: "Missing checkId or repoName" },
        { status: 400 }
      );
    }

    const promptTemplate = PROMPTS[checkId];
    let prompt: string;

    if (promptTemplate) {
      prompt = promptTemplate.replace(/\{repoName\}/g, repoName);
    } else {
      prompt = `You are a helpful developer assistant. 

The GitHub repository "${repoName}" failed this contributor readiness check:
- Check: ${checkLabel}
- Details: ${detail}

Generate a practical, ready-to-copy fix for this issue. Include:
1. A brief explanation of why this matters (2 sentences)
2. Step-by-step fix instructions
3. Any file content they need to create (with full content, not just placeholders)

Be specific, actionable, and use markdown formatting.`;
    }

    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Groq error:", errText);
      return NextResponse.json(
        { success: false, error: `Groq API error: ${response.status}` },
        { status: 500 }
      );
    }

    const data = await response.json();
    const fix = data.choices?.[0]?.message?.content ?? "No response generated";

    return NextResponse.json({ success: true, fix });

  } catch (error: unknown) {
    console.error("Fix API error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate fix";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}