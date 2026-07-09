import userModel from "../models/user.model.js"
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import tokenBlacklistModel from "../models/blacklist.model.js"

/**
 * @name registerUserController
 * @description register a new user, expects username, email and password in the request body
 * @access Public
 */

async function registerUserController(req,res) {
    const {username,email,password} = req.body
    if(!username || !email || !password) {
        return res.status(400).json({
            message: "Please provide username, email and password"
        })
    }
// 1.checking if the user has already an account using "findOne" 
    const isUserAlreadyExists = await userModel.findOne({
        $or: [ { username }, { email } ] //checking on the basis of username and email
    })

// return with message if duplicate user 
    if (isUserAlreadyExists) {
        return res.status(400).json({
            message: "Account already exists with this email address or username"
        })
    }
//2. hashing the password before creating a new user
    const hash = await bcrypt.hash(password,10)

// 3. creating a new user using "create"
    const user = await userModel.create({
        username,
        email,
        password: hash
    })
// 4. creating a token for the new user and then storing it in a cookie
// this required id,username,secret key
    const token = jwt.sign(
        { id: user._id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
    )
    res.cookie("token",token)
// lastly along with result send id,username and email
    res.status(201).json({
        message: "New user successfully created and registered",
        user: {
            id: user._id,
            username: user.username,
            email: user.email
        }
    })
}

async function loginUserController(req,res) {
// we require email and password and check both if they match the with credentials of registered user
    const {email,password} = req.body
//1. checking if email entered is correct one using findOne()
    const user = await userModel.findOne({email})
    
    if (!user) {
        return res.status(400).json({
            message: "Invalid email or password"
        })
    }
//2. checking password using bcrypt.compare(entered,actual)
    const isPasswordValid = await bcrypt.compare(password,user.password)

      if (!isPasswordValid) {
        return res.status(400).json({
            message: "Invalid email or password"
        })
    }
// after logging in, after verifying credentials from the token, this sent back to the user and stored in cookies
    const token = jwt.sign(
        { id: user._id, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
    )

    res.cookie("token", token)
    res.status(200).json({
        message: "User loggedIn successfully.",
        user: {
            id: user._id,
            username: user.username,
            email: user.email
        }
    })
}

// Imp note for logout process--> Token BlackListing
// this is basically to prevent a hacker(mallicious user) from doing
// requests on behalf of other user(who may have loggedOut) + assuming the hacker has secertly copied the token of the genuine user
//Acheived by putting the TOKEN of the loggedOut user in blacklist and
//preventing from further any misuse(by the mallicious user who still has the token(copied))
//** Generally done using Reddis, but here we use simply MongoDB*/


//*** IN LOGOUT CONTROLLER,Aim:- Delete token from the cookie and then move token into the blacklist*/

/**
 * @name logoutUserController
 * @description clear token from user cookie and add the token in blacklist
 * @access public
 */

// Logout controller
async function logoutUserController(req, res) {

    // Get JWT token from cookies
    const token = req.cookies.token

    // If token exists
    if (token) {

        // Store token in blacklist DB
        // so it cannot be used again
        await tokenBlacklistModel.create({ token })
    }

    // Remove token cookie from browser
    res.clearCookie("token")

    // Send success response
    res.status(200).json({
        message: "User logged out successfully"
    })
}

// Controller to get current logged-in user details
async function getMeController(req, res) {

    // req.user comes from auth middleware
    // decoded JWT data contains user id
    const user = await userModel.findById(req.user.id)

    // Send selected user data
    res.status(200).json({
        message: "User details fetched successfully",
        user: {
            id: user._id,
            username: user.username,
            email: user.email
        }
    })
}

export default {
    registerUserController,
    loginUserController,
    logoutUserController,
    getMeController
}

