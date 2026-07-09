import { getAllInterviewReports, generateInterviewReport, getInterviewReportById, generateResumePdf } from "../services/interview.api"
import { useContext, useEffect } from "react"
import { InterviewContext } from "../interview.context"
import { useParams } from "react-router"

export const useInterview = () => {

    // Access global interview state
    const context = useContext(InterviewContext)

    // Get interviewId from URL (e.g., /report/:interviewId)
    const { interviewId } = useParams()

    // Ensure hook is used inside InterviewProvider
    if (!context) {
        throw new Error("useInterview must be used within an InterviewProvider")
    }

    // Extract global state and setters
    const {
        loading,
        setLoading,
        report,
        setReport,
        reports,
        setReports
    } = context


    // Generate interview report using AI
    const generateReport = async ({ jobDescription, selfDescription, resumeFile }) => {

        setLoading(true)

        let response = null

        try {

            // Call backend API
            response = await generateInterviewReport({
                jobDescription,
                selfDescription,
                resumeFile
            })

            // Store generated report globally
            setReport(response.interviewReport)

        } catch (error) {

            console.log(error)

            // Throw to allow the page to display an alert if needed
            throw error

        } finally {

            setLoading(false)
        }

        // Return generated report safely
        return response?.interviewReport
    }


    // Fetch a single interview report
    const getReportById = async (interviewId) => {

        setLoading(true)

        let response = null

        try {

            // Fetch report using interview ID
            response = await getInterviewReportById(interviewId)

            // Store report globally
            setReport(response.interviewReport)

        } catch (error) {

            console.log(error)

        } finally {

            setLoading(false)
        }

        return response?.interviewReport
    }


    // Fetch all interview reports
    const getReports = async () => {

        setLoading(true)

        let response = null

        try {

            // Fetch all reports
            response = await getAllInterviewReports()

            // Store reports globally
            setReports(response.interviewReports)

        } catch (error) {

            console.log(error)

        } finally {

            setLoading(false)
        }

        return response.interviewReports
    }


    // Download generated resume PDF
    const getResumePdf = async (interviewId) => {

        setLoading(true)

        let response = null

        try {

            // Request PDF from backend
            response = await generateResumePdf({
                interviewId
            })

            if (!response || (response.size !== undefined && response.size === 0)) {
                throw new Error("Received empty PDF response")
            }

            if (response.type && response.type !== "application/pdf") {
                const errorText = await response.text().catch(() => null)
                throw new Error(`Invalid PDF response type: ${response.type}${errorText ? ` - ${errorText}` : ""}`)
            }

            // Convert binary data into downloadable PDF URL
            const url = window.URL.createObjectURL(response)

            // Create temporary download link
            const link = document.createElement("a")
            link.href = url
            link.setAttribute("download", `resume_${interviewId}.pdf`)
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.URL.revokeObjectURL(url)

        } catch (error) {

            console.log(error)

        } finally {

            setLoading(false)
        }
    }


    // Automatically fetch data when page loads
    useEffect(() => {

        // If URL contains interviewId
        if (interviewId) {

            // Fetch single report
            getReportById(interviewId)

        } else {

            // Otherwise fetch all reports
            getReports()
        }

    }, [interviewId])


    // Expose state and functions
    return {
        loading,
        report,
        reports,

        generateReport,
        getReportById,
        getReports,
        getResumePdf
    }

}