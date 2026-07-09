import axios from "axios"

// Create a reusable Axios instance
const api = axios.create({

    // Backend server URL
    baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:3001",

    // Send cookies (JWT) with every request
    withCredentials: true
})


// Register a new user
export async function register({ username, email, password }) {

    try {

        // Send POST request with user details
        const response = await api.post(
            '/api/auth/register',
            {
                username,
                email,
                password
            }
        )

        // Return backend response
        return response.data

    } catch (error) {

        console.error(error)

        // Pass error to caller
        throw error
    }
}


// Login existing user
export async function login({ email, password }) {

    try {

        // Send login credentials
        const response = await api.post(
            '/api/auth/login',
            {
                email,
                password
            }
        )

        return response.data

    } catch (error) {

        console.error(error)
        throw error
    }
}


// Logout current user
export async function logout() {

    try {

        // Call logout endpoint
        const response = await api.get('/api/auth/logout')

        return response.data

    } catch (error) {

        console.error(error)
        throw error
    }
}


// Get currently logged-in user's details
export async function getMe() {

    try {

        // Fetch authenticated user
        const response = await api.get('/api/auth/get-me')

        return response.data

    } catch (error) {

        // If the user isn't authenticated, return a null user instead
        // of throwing so the initial auth check doesn't spam the console.
        if (error.response && error.response.status === 401) {
            return { user: null }
        }

        console.error(error)
        throw error
    }
}