import { createContext, useState } from "react"; 

// Create global Interview Context
export const InterviewContext = createContext()

export const InterviewProvider = ({ children }) => {

    // Loading state for interview-related API calls
    const [loading, setLoading] = useState(false)

    // Stores currently selected interview report
    const [report, setReport] = useState(null)

    // Stores list of all interview reports
    const [reports, setReports] = useState([])

    return (

        // Make interview state available globally
        <InterviewContext.Provider
            value={{
                loading,
                setLoading,
                report,
                setReport,
                reports,
                setReports
            }}
        >

            {/* Render wrapped child components */}
            {children}

        </InterviewContext.Provider>
    )
}