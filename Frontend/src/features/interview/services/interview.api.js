import axios from "axios";

// Create reusable Axios instance
const api = axios.create({

    // Backend server URL
    baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:3001",

    // Automatically send authentication cookies
    withCredentials: true,
})


/**
 * @description Service to generate interview report
 * using resume, self description and job description.
 */
export const generateInterviewReport = async ({
    jobDescription,
    selfDescription,
    resumeFile
}) => {

    // Create FormData to send file + text
    const formData = new FormData()

    // Add text fields
    formData.append("jobDescription", jobDescription)
    formData.append("selfDescription", selfDescription)

    // Add uploaded PDF file only if the user provided one
    if (resumeFile) {
        formData.append("resume", resumeFile)
    }

    // Send multipart/form-data request
    const response = await api.post(
        "/api/interview/",
        formData
    )

    // Return backend response
    return response.data
}


/**
 * @description Fetch a single interview report
 * using interview ID.
 */
export const getInterviewReportById = async (interviewId) => {

    // GET interview report
    const response = await api.get(
        `/api/interview/report/${interviewId}`
    )

    return response.data
}


/**
 * @description Fetch all interview reports
 * of logged-in user.
 */
export const getAllInterviewReports = async () => {

    // GET all interview reports
    const response = await api.get("/api/interview/")

    return response.data
}


/**
 * @description Generate Resume PDF
 * from an interview report.
 */
export const generateResumePdf = async ({
    interviewId
}) => {

    // Request backend to generate PDF
    const response = await api.post(

        `/api/interview/resume/pdf/${interviewId}`,

        // No request body
        null,

        {
            // Expect binary PDF instead of JSON
            responseType: "blob"
        }
    )

    // Return PDF blob
    return response.data
}