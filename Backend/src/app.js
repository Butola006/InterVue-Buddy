import express from "express"
import cookieParser from "cookie-parser"
import authRouter from "./routes/auth.routes.js"
import interviewRouter from "./routes/interview.routes.js"
import cors from "cors"

const app = express()

app.use(express.json())
app.use(cookieParser())

const allowedOrigins = [
    process.env.FRONTEND_URL,
    "http://localhost:5173",
    "https://localhost:5173"
].filter(Boolean)

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}))

//using all the routes here and for every API call to use we need base path which is defined under " "},{
app.use("/api/auth", authRouter)
app.use("/api/interview",interviewRouter)

export default app
 