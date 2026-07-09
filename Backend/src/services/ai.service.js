import { GoogleGenAI } from "@google/genai"; 
import * as z from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import puppeteer from "puppeteer";

//meant for configuring/intializing the services once
const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY
})

// A CONSTANT, account for re-usable configuration(of models,urls etc.)
const MODEL_CANDIDATES = [
    process.env.GOOGLE_GENAI_MODEL,
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
    "gemini-2.5-flash"
].filter(Boolean)

//Below 3 are support/helper functions
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

function normalizePromptText(text) {
    return String(text ?? "")
        .replace(/\(p\.\s*\d+\)/gi, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
}

function isTransientAiError(error) {
    const status = Number(error?.status ?? error?.code)
    const message = String(error?.message ?? "")

    return status === 429 || status === 503 || /UNAVAILABLE|RESOURCE_EXHAUSTED|rate limit|temporarily unavailable/i.test(message)
}

function isModelUnavailableError(error) {
    const status = Number(error?.status ?? error?.code)
    const message = String(error?.message ?? "")

    return status === 404 || /model.*not found|unsupported model|invalid model|unknown model/i.test(message)
}

// ✅ FIX 1: Strips markdown code fences (```json ... ```) that Gemini sometimes wraps around JSON
function stripMarkdownCodeFences(text) {
    if (typeof text !== "string") return text

    return String(text)
        .replace(/^\s*```(?:json)?\s*/i, "")
        .replace(/\s*```\s*$/g, "")
        .trim()
}

function cleanJsonResponse(text) {
    if (typeof text !== "string") return text

    let cleaned = stripMarkdownCodeFences(text)

    const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
    if (fenceMatch) {
        cleaned = fenceMatch[1].trim()
    }

    cleaned = cleaned
        .replace(/^\s*```(?:json)?\s*/i, "")
        .replace(/\s*```\s*$/i, "")
        .trim()

    return cleaned
}

function extractJsonPayload(text) {
    if (typeof text !== "string") return text

    const cleaned = cleanJsonResponse(text)
    const start = cleaned.search(/[\{\[]/)
    if (start === -1) return cleaned

    const openChar = cleaned[start]
    const closeChar = openChar === "{" ? "}" : "]"
    let depth = 0
    let inString = false
    let escape = false

    for (let i = start; i < cleaned.length; i++) {
        const char = cleaned[i]

        if (escape) {
            escape = false
            continue
        }

        if (char === "\\") {
            escape = true
            continue
        }

        if (char === '"') {
            inString = !inString
            continue
        }

        if (inString) continue

        if (char === openChar) {
            depth++
        } else if (char === closeChar) {
            depth--
            if (depth === 0) {
                return cleaned.slice(start, i + 1).trim()
            }
        }
    }

    return cleaned
}

// helper functions till here 

//Schema, before the main business logic/functions
const interviewReportSchema = z.object({
    matchScore: z.number().describe("A score between 0 and 100 indicating how well the candidate's profile matches the job describe"),
    technicalQuestions: z.array(z.object({
        question: z.string().describe("The technical question can be asked in the interview"),
        intention: z.string().describe("The intention of interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc.")
    })).describe("Technical questions that can be asked in the interview along with their intention and how to answer them"),
    behavioralQuestions: z.array(z.object({
        question: z.string().describe("The technical question can be asked in the interview"),
        intention: z.string().describe("The intention of interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc.")
    })).describe("Behavioral questions that can be asked in the interview along with their intention and how to answer them"),
    skillGaps: z.array(z.object({ 
        skill: z.string().describe("The skill which the candidate is lacking"),
        severity: z.enum([ "low", "medium", "high" ]).describe("The severity of this skill gap, i.e. how important is this skill for the job and how much it can impact the candidate's chances")
    })).describe("List of skill gaps in the candidate's profile along with their severity"),
    preparationPlan: z.array(z.object({
        day: z.number().describe("The day number in the preparation plan, starting from 1"),
        focus: z.string().describe("The main focus of this day in the preparation plan, e.g. data structures, system design, mock interviews etc."),
        tasks: z.array(z.string()).describe("List of tasks to be done on this day to follow the preparation plan, e.g. read a specific book or article, solve a set of problems, watch a video etc.")
    })).describe("A day-wise preparation plan for the candidate to follow in order to prepare for the interview effectively"),
    title: z.string().describe("The title of the job for which the interview report is generated"),
})

//⭐ Business Logic/Service Functions :- here define all your new functions

//This generates interviewReport based on the 3 inputs
 
async function generateInterviewReport({ resume, selfDescription, jobDescription }) { 
    const cleanResume = normalizePromptText(resume)
    const cleanSelfDescription = normalizePromptText(selfDescription)
    const cleanJobDescription = normalizePromptText(jobDescription)

        const prompt = `Generate an interview report for a candidate with the following details.
Return ONLY valid JSON. Do not include any markdown, explanations, or text outside the JSON.
All strings must have proper escaping (\\n for newlines, \\" for quotes).

Required output fields (types shown):
- title: string (a short job title inferred from the job description or resume)
- matchScore: number (0-100)
- technicalQuestions: array of objects [{ question: string, intention: string, answer: string }]
- behavioralQuestions: array of objects [{ question: string, intention: string, answer: string }]
- skillGaps: array of objects [{ skill: string, severity: "low"|"medium"|"high" }]
- preparationPlan: array of objects [{ day: number, focus: string, tasks: [string] }]

IMPORTANT: Return ONLY this JSON structure with no additional text, markdown, or comments. Ensure all newlines in strings are escaped as \\n.

{
    "title": "Frontend Engineer",
    "matchScore": 82,
    "technicalQuestions": [
        { "question": "Explain the virtual DOM.", "intention": "Assess React fundamentals", "answer": "Explain reconciliation and diffing." }
    ],
    "behavioralQuestions": [
        { "question": "Describe a conflict you resolved.", "intention": "Assess teamwork", "answer": "I listened, aligned on goals, and compromised." }
    ],
    "skillGaps": [
        { "skill": "Unit testing", "severity": "medium" }
    ],
    "preparationPlan": [
        { "day": 1, "focus": "Data structures", "tasks": ["Review arrays and hash maps"] }
    ]
}

Resume:
${cleanResume}

Self Description:
${cleanSelfDescription}

Job Description:
${cleanJobDescription}
        `

    const maxAttempts = 3
    let lastError


    for (const model of MODEL_CANDIDATES) {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const result = await ai.models.generateContent({  
                    model,
                    contents: prompt,
                    config: {
                        responseFormat: {
                            text: {
                            mimeType: "application/json",
                            schema: zodToJsonSchema(interviewReportSchema)
                            }
                        }
                    }
                })

                // ✅ FIX 2 APPLIED: Clean and strip markdown fences before parsing
                const rawText = cleanJsonResponse(result.text)

                // Parse JSON returned by the model
                let parsed
                try {
                    parsed = JSON.parse(rawText)
                } catch (parseErr) {
                    const fallbackText = extractJsonPayload(rawText)

                    try {
                        parsed = JSON.parse(fallbackText)
                    } catch (fallbackParseErr) {
                        // Try to fix common JSON issues (unescaped newlines/quotes in strings)
                        let cleanedJson = fallbackText
                            .replace(/\n/g, "\\n")  // Escape actual newlines
                            .replace(/\r/g, "\\r")  // Escape carriage returns
                            .replace(/\t/g, "\\t")  // Escape tabs
                        
                        try {
                            parsed = JSON.parse(cleanedJson)
                        } catch (cleanedParseErr) {
                            console.error("❌ AI returned invalid JSON even after cleanup:")
                            console.error("Raw response (first 500 chars):", rawText.substring(0, 500))
                            console.error("Error at position:", parseErr.message)
                            
                            const jsonError = new Error(`Failed to parse AI response as JSON: ${cleanedParseErr.message}`)
                            jsonError.cause = { parseError: cleanedParseErr, rawResponse: rawText.substring(0, 1000) }
                            throw jsonError
                        }
                    }
                }

                // Validate using zod to ensure types match expectations and provide a clear error
                try {
                    const validated = interviewReportSchema.parse(parsed)
                    return validated
                } catch (zErr) {
                    const validationError = new Error(`AI response validation failed: ${zErr.message}`)
                    // Attach raw model output to the error for easier debugging upstream
                    validationError.cause = { zodError: zErr, rawResponse: result.text }
                    throw validationError
                }
            } 
            catch (error) {
                lastError = error

                if (isModelUnavailableError(error)) {
                    break
                }

                if (!isTransientAiError(error) || attempt === maxAttempts) {
                    break
                }

                await sleep(1000 * attempt)
            }
        }
    }

    const fallbackError = new Error(lastError?.message || "Failed to generate interview report")
    fallbackError.statusCode = isTransientAiError(lastError) ? 503 : 500
    fallbackError.cause = lastError

    throw fallbackError
}

// Convert HTML into PDF using Puppeteer
async function generatePdfFromHtml({ htmlContent }) {

    // Launch headless Chrome
    const browser = await puppeteer.launch({
        rgs: ['--no-sandbox', '--disable-setuid-sandbox'] // safer for prod/deploy
    })

    // Open a new browser page
    const page = await browser.newPage()

    // Load generated HTML
    await page.setContent(htmlContent, {
        waitUntil: "networkidle0"
    })

    // Convert page into PDF
    const pdfUint8 = await page.pdf({
        format: "A4",
        printBackground: true,   // ensures colors/backgrounds render
        margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" }
    })

    // Close browser
    await browser.close()

    /// 🔑 Convert Uint8Array -> Buffer so Express sends it as binary
    return Buffer.from(pdfUint8)
}


const resumeContentSchema = z.object({
    name: z.string().describe("Full name of the candidate"),
    contact: z.object({
        email: z.string().email(),
        phone: z.string().optional().default(""),
        linkedin: z.string().optional().default(""),
        github: z.string().optional().default(""),
        location: z.string().optional().default("")
    }),
    summary: z.string().describe("2-3 line professional summary tailored to the job"),
    education: z.array(z.object({
        degree: z.string(),
        institution: z.string(),
        duration: z.string(),
        score: z.string().optional().default("")
    })).optional().default([]),
    experience: z.array(z.object({
        role: z.string(),
        company: z.string(),
        duration: z.string(),
        location: z.string().optional().default(""),
        bullets: z.array(z.string())
    })).optional().default([]),
    projects: z.array(z.object({
        name: z.string(),
        tech: z.string().describe("Comma-separated tech stack"),
        bullets: z.array(z.string())
    })).optional().default([]),
    skills: z.array(z.object({
        category: z.string().describe("e.g. Languages, Frontend, Backend, Databases, Tools"),
        items: z.string().describe("Comma-separated list")
    })).optional().default([]),
    achievements: z.array(z.string()).optional().default([])
})

// async function generateResumePdf({ resume, selfDescription, jobDescription }) {
//     const cleanResume = normalizePromptText(resume)
//     const cleanSelfDescription = normalizePromptText(selfDescription)
//     const cleanJobDescription = normalizePromptText(jobDescription)

//     const prompt = `You are an expert resume writer for tech roles.
// Return ONLY valid JSON matching the schema below. No markdown, no explanation, no extra text.

// Schema:
// {
//   "name": "Full Name",
//   "contact": { "email": "", "phone": "", "linkedin": "", "github": "", "location": "" },
//   "summary": "2-3 line pitch tailored to the target role.",
//   "education": [{ "degree": "", "institution": "", "duration": "", "score": "" }],
//   "experience": [{ "role": "", "company": "", "duration": "", "location": "", "bullets": ["..."] }],
//   "projects": [{ "name": "", "tech": "", "bullets": ["..."] }],
//   "skills": [{ "category": "", "items": "" }],
//   "achievements": [""]
// }

// Rules:
// - Keep it to one A4 page.
// - Use up to 3 experience entries and 3 bullets each.
// - Use up to 3 projects and 5-6 skill categories.
// - Use strong action verbs and quantify results.
// - If resume is empty, infer high-quality details from the self-description and job description.
// - Use exact contact info from the resume when available.

// Original Resume: ${cleanResume || "(empty)"}
// Self Description: ${cleanSelfDescription}
// Target Job Description: ${cleanJobDescription}`

//     const maxAttempts = 3
//     let lastError

//     for (const model of MODEL_CANDIDATES) {
//         for (let attempt = 1; attempt <= maxAttempts; attempt++) {
//             try {
//                 const result = await ai.models.generateContent({
//                     model,
//                     contents: prompt,
//                     config: {
//                         responseFormat: {
//                             text: {
//                                 mimeType: "application/json",
//                                 schema: zodToJsonSchema(resumeContentSchema)
//                             }
//                         }
//                     }
//                 })

//                 const cleanedText = cleanJsonResponse(result.text)
//                 let parsed

//                 try {
//                     parsed = JSON.parse(cleanedText)
//                 } catch (parseErr) {
//                     const fallbackText = extractJsonPayload(cleanedText)
//                     try {
//                         parsed = JSON.parse(fallbackText)
//                     } catch (fallbackParseErr) {
//                         console.error("❌ Resume PDF - Invalid JSON from AI:", fallbackText.substring(0, 300))
//                         const jsonError = new Error(`Failed to parse resume HTML JSON: ${fallbackParseErr.message}`)
//                         jsonError.cause = { parseError: fallbackParseErr, rawResponse: fallbackText.substring(0, 500) }
//                         throw jsonError
//                     }
//                 }

//                 const validated = resumeContentSchema.parse(parsed)
//                 const htmlContent = buildResumeHtml(validated)

//                 return await generatePdfFromHtml({ htmlContent })
//             } catch (error) {
//                 lastError = error
//                 if (isModelUnavailableError(error)) break
//                 if (!isTransientAiError(error) || attempt === maxAttempts) break
//                 await sleep(1000 * attempt)
//             }
//         }
//     }

//     const fallbackError = new Error(lastError?.message || "Failed to generate resume PDF")
//     fallbackError.statusCode = isTransientAiError(lastError) ? 503 : 500
//     fallbackError.cause = lastError
//     throw fallbackError
// }

// ==== Fixed HTML template (Cisco/on-campus style) ====
function buildResumeHtml(data) {
    const esc = (s = "") => String(s)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

    const contactLine = [
        data.contact.email && `<a href="mailto:${esc(data.contact.email)}">${esc(data.contact.email)}</a>`,
        data.contact.phone && esc(data.contact.phone),
        data.contact.linkedin && `<a href="https://${esc(data.contact.linkedin)}">LinkedIn</a>`,
        data.contact.github && `<a href="https://${esc(data.contact.github)}">GitHub</a>`,
        data.contact.location && esc(data.contact.location)
    ].filter(Boolean).join("  |  ")

    const section = (title, body) => body ? `
        <section>
            <h2>${title}</h2>
            ${body}
        </section>` : ""

    const eduHtml = data.education?.length ? data.education.map(e => `
        <div class="entry">
            <div class="entry-head">
                <span class="left"><strong>${esc(e.institution)}</strong> — ${esc(e.degree)}</span>
                <span class="right">${esc(e.duration)}${e.score ? ` | ${esc(e.score)}` : ""}</span>
            </div>
        </div>`).join("") : ""

    const expHtml = data.experience?.length ? data.experience.map(e => `
        <div class="entry">
            <div class="entry-head">
                <span class="left"><strong>${esc(e.role)}</strong>${e.company ? `, ${esc(e.company)}` : ""}</span>
                <span class="right">${esc(e.duration)}${e.location ? ` | ${esc(e.location)}` : ""}</span>
            </div>
            <ul>${e.bullets.map(b => `<li>${esc(b)}</li>`).join("")}</ul>
        </div>`).join("") : ""

    const projHtml = data.projects?.length ? data.projects.map(p => `
        <div class="entry">
            <div class="entry-head">
                <span class="left"><strong>${esc(p.name)}</strong></span>
                <span class="right"><em>${esc(p.tech)}</em></span>
            </div>
            <ul>${p.bullets.map(b => `<li>${esc(b)}</li>`).join("")}</ul>
        </div>`).join("") : ""

    const skillsHtml = data.skills?.length ? `
        <ul class="skills">
            ${data.skills.map(s => `<li><strong>${esc(s.category)}:</strong> ${esc(s.items)}</li>`).join("")}
        </ul>` : ""

    const achHtml = data.achievements?.length
        ? `<ul>${data.achievements.map(a => `<li>${esc(a)}</li>`).join("")}</ul>`
        : ""

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
    @page { size: A4; margin: 14mm 16mm; }
    * { box-sizing: border-box; }
    body {
        font-family: 'Georgia', 'Times New Roman', serif;
        color: #111;
        font-size: 10.5pt;
        line-height: 1.35;
        margin: 0;
    }
    header { text-align: center; margin-bottom: 8px; }
    header h1 {
        font-size: 20pt;
        letter-spacing: 1.5px;
        margin: 0 0 4px;
        text-transform: uppercase;
        font-weight: 700;
    }
    header .contact { font-size: 9.5pt; color: #222; }
    header a { color: #111; text-decoration: none; }
    section { margin-top: 10px; }
    h2 {
        font-size: 11pt;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin: 0 0 4px;
        padding-bottom: 2px;
        border-bottom: 1px solid #111;
        font-weight: 700;
    }
    .entry { margin: 6px 0; page-break-inside: avoid; }
    .entry-head {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 12px;
        margin-bottom: 2px;
    }
    .entry-head .left { flex: 1; }
    .entry-head .right { white-space: nowrap; font-size: 9.5pt; color: #333; }
    ul { margin: 3px 0 0 18px; padding: 0; }
    li { margin: 2px 0; text-align: justify; }
    ul.skills { list-style: none; margin-left: 0; }
    ul.skills li { margin: 3px 0; }
    p.summary { margin: 0; text-align: justify; }
    em { font-style: italic; color: #333; }
</style>
</head>
<body>
    <header>
        <h1>${esc(data.name)}</h1>
        <div class="contact">${contactLine}</div>
    </header>

    ${section("Summary", `<p class="summary">${esc(data.summary)}</p>`)}
    ${section("Education", eduHtml)}
    ${section("Experience", expHtml)}
    ${section("Projects", projHtml)}
    ${section("Technical Skills", skillsHtml)}
    ${section("Achievements", achHtml)}
</body>
</html>`
}

// ==== Main function (replaces your existing generateResumePdf) ====
async function generateResumePdf({ resume, selfDescription, jobDescription }) {
    const cleanResume = normalizePromptText(resume)
    const cleanSelfDescription = normalizePromptText(selfDescription)
    const cleanJobDescription = normalizePromptText(jobDescription)

    const prompt = `You are an expert resume writer for tech on-campus placements.
Generate a CONCISE, ONE-PAGE, ATS-optimised resume as STRUCTURED JSON matching this schema.

CRITICAL RULES:
- Return ONLY valid JSON. No markdown fences, no explanations.
- Keep it TIGHT so it fits on ONE A4 page:
    * Max 3 experience entries, 3 bullets each
    * Max 3 projects, 3 bullets each
    * Max 5-6 skill categories
    * Max 4 achievements
- Every bullet: start with a strong action verb (Built, Designed, Optimised, Led, Reduced, Automated, etc.)
- Quantify wherever plausible (%, users, ms, req/s, PRs, hours).
- Weave in ATS keywords lifted DIRECTLY from the target job description (frameworks, tools, methodologies).
- Use crisp, past-tense, single-sentence bullets (~15-22 words).
- If Original Resume is empty, infer realistic data from Self Description + Job Description.
- Contact fields: use exact values from Original Resume if present; else generate plausible ones.

JSON schema (return exactly these keys):
{
  "name": "Full Name",
  "contact": { "email": "", "phone": "", "linkedin": "linkedin.com/in/...", "github": "github.com/...", "location": "" },
  "summary": "2-3 line pitch tailored to the target role, embedding 3-4 top keywords from the JD.",
  "education": [{ "degree": "", "institution": "", "duration": "", "score": "" }],
  "experience": [{ "role": "", "company": "", "duration": "", "location": "", "bullets": ["..."] }],
  "projects": [{ "name": "", "tech": "React, Node.js, MongoDB", "bullets": ["..."] }],
  "skills": [{ "category": "Languages", "items": "..." }, { "category": "Frontend", "items": "..." }],
  "achievements": ["..."]
}

Original Resume: ${cleanResume || "(empty)"}
Self Description: ${cleanSelfDescription}
Target Job Description: ${cleanJobDescription}`

    const maxAttempts = 3
    let lastError

    for (const model of MODEL_CANDIDATES) {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const result = await ai.models.generateContent({
                    model,
                    contents: prompt,
                    config: {
                        responseFormat: {
                            text: {
                                mimeType: "application/json",
                                schema: zodToJsonSchema(resumeContentSchema)
                            }
                        }
                    }
                })

                const cleanedText = cleanJsonResponse(result.text)
                let parsed
                try {
                    parsed = JSON.parse(cleanedText)
                } catch {
                    parsed = JSON.parse(extractJsonPayload(cleanedText))
                }

                const validated = resumeContentSchema.parse(parsed)
                const htmlContent = buildResumeHtml(validated)

                return Buffer.from(await generatePdfFromHtml({ htmlContent }))
            } catch (error) {
                lastError = error
                if (isModelUnavailableError(error)) break
                if (!isTransientAiError(error) || attempt === maxAttempts) break
                await sleep(1000 * attempt)
            }
        }
    }

    const fallbackError = new Error(lastError?.message || "Failed to generate resume PDF")
    fallbackError.statusCode = isTransientAiError(lastError) ? 503 : 500
    fallbackError.cause = lastError
    throw fallbackError
}

export default {generateInterviewReport,generateResumePdf}
