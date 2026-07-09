import { Router } from "express"
import authController from "../controllers/auth.Controller.js"
import authMiddleware from "../middlewares/auth.middleware.js"

const authRouter = Router()

// below is 'js doc comments'--> tells the logic behind the route
/**
 * @route POST /api/auth/register
 * @description Register a new user
 * @access Public
 */
//more expln below
/**
 * POST /api/auth/register
 * When frontend hits this endpoint,
 * registerUserController will run
 */

// each route is being driven by the logic written in respective controller
authRouter.post("/register", authController.registerUserController)


/**
 * @route POST /api/auth/login
 * @description login user with email and password
 * @access Public
 */
authRouter.post("/login", authController.loginUserController)

/**
 * @route GET /api/auth/logout
 * @description  clear token from user cookie and add the token in blacklist
 * @access Public
 */
authRouter.get("/logout", authController.logoutUserController)

/**
 * @route GET /api/auth/get-me
 * @description get the current logged in user details
 * @access private
 */
authRouter.get("/get-me", authMiddleware.authUser, authController.getMeController)

export default authRouter

