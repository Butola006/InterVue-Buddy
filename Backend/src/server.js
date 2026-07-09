import "./env.js"
import app from "./app.js"
import connectToDB from "./config/database.js"

const PORT = process.env.PORT || 3001

const startServer = async () => {
    try {
        await connectToDB()

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`)
        })
    } catch (error) {
        console.error("Failed to start server:", error)
        process.exit(1)
    }
}

startServer()