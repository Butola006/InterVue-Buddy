// Import PDF parser to extract text from uploaded resume
import { PDFParse } from "pdf-parse"

// Import AI service that generates interview report
import aiService from "../services/ai.service.js"
const { generateInterviewReport, generateResumePdf } = aiService

// Import MongoDB model to save report
import interviewReportModel from "../models/interviewReport.model.js"

/**
 * @description Generate interview report using:
 * 1. Resume
 * 2. Self Description
 * 3. Job Description
 */
async function generateInterviewReportController(req, res) {

    try {

        // Uploaded PDF resume (from multer)
        const resumeFile = req.file

        // Get additional details from request body
        const { selfDescription, jobDescription } = req.body

        console.debug("Interview generation request:", {
            jobDescription: Boolean(jobDescription),
            selfDescription: Boolean(selfDescription),
            resumeFile: resumeFile ? resumeFile.originalname : null
        })

        // Validate required job description
        if (!jobDescription || jobDescription.trim().length === 0) {
            return res.status(400).json({
                message: "Job description is required"
            })
        }

        // Require resume or self-description
        if (!resumeFile && (!selfDescription || selfDescription.trim().length === 0)) {
            return res.status(400).json({
                message: "Either a resume file or a self-description is required"
            })
        }

        let resumeText = ""

        if (resumeFile) {
            // Extract text using pdf-parse v2 API via PDFParse instance
            const parser = new PDFParse({ data: resumeFile.buffer })
            const resumeContent = await parser.getText()

            // getText returns an object with a text property
            resumeText = resumeContent?.text || ""
        }

        // Send extracted resume + user details to Gemini
        const interviewReportByAi = await generateInterviewReport({

            // Resume text extracted from PDF, or blank when none
            resume: resumeText,

            // User's own description
            selfDescription,

            // Target job description
            jobDescription
        })

        // Save complete interview report in MongoDB
        const interviewReport = await interviewReportModel.create({

            // Logged-in user ID
            user: req.user.id,

            // Store original inputs
            resume: resumeText,
            selfDescription,
            jobDescription,

            // Spread AI-generated fields
            ...interviewReportByAi
        })

        // Send success response
        res.status(201).json({
            message: "Interview report generated successfully.",
            interviewReport
        })

    } 
    catch (error) {

        // Log error on server
        console.error("Failed to generate interview report:", error)

        // Get error status (default = 500)
        const statusCode = error?.statusCode || error?.status || 500

        // Build a helpful error message in development
        let message

        if (statusCode === 503) {
            message = "AI provider is temporarily overloaded. Please retry in a moment."
        } else {
            message = "Failed to generate interview report"

            // Expose detailed error message in non-production for debugging
            if (process.env.NODE_ENV !== "production") {
                message += `: ${error?.cause?.message || error?.message || "unknown error"}`
            }
        }

        return res.status(statusCode).json({ message })
    }
}

/**
 * @description Controller to fetch a single interview report
 * of the logged-in user using interview ID.
 */
async function getInterviewReportByIdController(req, res) {

    // Get interview ID from URL parameters
    const { interviewId } = req.params

    // Find report by:
    // 1. Interview ID
    // 2. Logged-in user ID (security check)
    const interviewReport = await interviewReportModel.findOne({
        _id: interviewId,
        user: req.user.id
    })

    // If report doesn't exist
    if (!interviewReport) {
        return res.status(404).json({
            message: "Interview report not found."
        })
    }

    // Send interview report
    res.status(200).json({
        message: "Interview report fetched successfully.",
        interviewReport
    })
}

/**
 * @description Controller to fetch all interview reports
 * of the logged-in user.
 */
async function getAllInterviewReportsController(req, res) {

    // Find all reports belonging to current user
    const interviewReports = await interviewReportModel

        .find({
            user: req.user.id
        })

        // Show latest reports first
        .sort({
            createdAt: -1
        })

        // Exclude large/unnecessary fields
        .select(
            "-resume -selfDescription -jobDescription -__v -technicalQuestions -behavioralQuestions -skillGaps -preparationPlan"
        )

    // Send all reports
    res.status(200).json({
        message: "Interview reports fetched successfully.",
        interviewReports
    })
}

/**
 * @description Controller to generate resume PDF based on user self description, resume and job description.
 */
/**
 * @description Controller to generate resume PDF based on user's interview report.
 */
async function generateResumePdfController(req, res) {

    try {
        // Get interview report ID from URL parameters
        const { interviewId } = req.params

        // Fetch interview report from MongoDB
        const interviewReport = await interviewReportModel.findById(interviewId)

        // Return 404 if report doesn't exist
        if (!interviewReport) {
            return res.status(404).json({
                message: "Interview report not found."
            })
        }

        // Extract required data for resume generation
        const {
            resume,
            jobDescription,
            selfDescription
        } = interviewReport

        // Validate that we have enough data to generate resume
        if (!selfDescription || selfDescription.trim().length === 0) {
            return res.status(400).json({
                message: "Cannot generate resume without self-description. Please regenerate the interview report."
            })
        }

        // Note: resume can be empty; AI will generate from selfDescription + jobDescription
        if (!resume || resume.trim().length === 0) {
            console.warn(`⚠️ Generating resume without original resume text for report ${interviewId}. Using self-description only.`)
        }

        // Generate PDF buffer using AI service
        const pdfBuffer = Buffer.from(await generateResumePdf({
                resume: resume || "", // Pass empty string if no resume
                jobDescription,
                selfDescription
            })
         )

        // Tell browser that response is a downloadable PDF
        res.status(200)
            .set({
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename=resume_${interviewId}.pdf`,
                "Content-Length": pdfBuffer.length
            })
            .end(pdfBuffer)
    }
    catch (error) {
        console.error("Failed to generate resume PDF:", error)
        
        const statusCode = error?.statusCode || 500
        const message = process.env.NODE_ENV === "production" 
            ? "Failed to generate resume PDF"
            : `Failed to generate resume PDF: ${error?.message || "unknown error"}`

        return res.status(statusCode).json({ message })
    }
}
export default {
    generateInterviewReportController,
    getInterviewReportByIdController,
    getAllInterviewReportsController,
    generateResumePdfController
}