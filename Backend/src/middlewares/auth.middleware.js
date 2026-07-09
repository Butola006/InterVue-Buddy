// Middleware for protected routes

import jwt from "jsonwebtoken"
import tokenBlacklistModel from "../models/blacklist.model.js"

async function authUser(req,res,next) {
    const token = req.cookies.token;

    if(!token) {
        return res.status(401).json({
            message: "Token not provided"
        })
    }

    // Check if token is blacklisted
    const isTokenBlacklisted = await tokenBlacklistModel.findOne({
        token
    })

    // If token exists in blacklist
    // user is treated as unauthorized
    if (isTokenBlacklisted) {
        return res.status(401).json({
            message: "token is invalid"
        })
    }

    try {

        // Verify JWT token using secret key
// upon reading the token we store that data in a 'decoded' variable
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        )

        // Store decoded user data in request
        req.user = decoded

        // Move to next middleware/controller
        next()

    } catch (err) {

        // Token invalid or expired
        return res.status(401).json({
            message: "Invalid token."
        })
    }
}

export default {authUser}