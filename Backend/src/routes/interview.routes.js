import { Router } from "express"
import upload from "../middlewares/file.middleware.js"
import authMiddleware from "../middlewares/auth.middleware.js"
import interviewController from "../controllers/interview.controller.js"

const interviewRouter = Router()

/**
 * @route POST /api/interview/
 * @description generate new interview report on the basis of user self description,resume pdf and job description.
 * @access private
 */

/** flow:- authenticate the user(via middleware)-->then alow them to upload resume-->finally generate interviewReport */
interviewRouter.post("/", authMiddleware.authUser, upload.single("resume"), interviewController.generateInterviewReportController)

/**
 * @route GET /api/interview/report/:interviewId
 * @description get interview report by interviewId.
 * @access private
 */
interviewRouter.get("/report/:interviewId", authMiddleware.authUser, interviewController.getInterviewReportByIdController)

/**
 * @route GET /api/interview/
 * @description get ALL interview reports of logged in user.
 * @access private
 */
interviewRouter.get("/", authMiddleware.authUser, interviewController.getAllInterviewReportsController)

/**
 * @route GET /api/interview/resume/pdf
 * @description generate resume pdf on the basis of user self description, resume content and job description.
 * @access private
 */
interviewRouter.post("/resume/pdf/:interviewId",authMiddleware.authUser,interviewController.generateResumePdfController)

export default interviewRouter 