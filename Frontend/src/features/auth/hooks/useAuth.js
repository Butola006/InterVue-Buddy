import { useContext, useEffect } from "react";
import { AuthContext } from "../auth.context.jsx";
import { register, login, logout, getMe } from "../services/auth.api";

export const useAuth = () =>  {

    // Access global auth state from Context
    const context = useContext(AuthContext)

    // Extract required values
    const { user, setUser, loading, setLoading } = context


    // Login user
    const handleLogin = async ({ email,password }) => {

        // Show loading
        setLoading(true);

        try {

            // Call login API
            const data = await login({ email,password });

            // Store logged-in user globally
            setUser(data.user)

            return data

        } catch (error) {

            throw error

        } finally {

            // Hide loading
            setLoading(false);
        }
    }


    // Register new user
    const handleRegister = async ({ username,email,password }) => { 

        setLoading(true);

        try {

            // Call register API
            const data = await register({ username,email,password });

            // Store newly registered user
            setUser(data.user)

            return data

        } catch (error) {

            throw error

        } finally {

            setLoading(false);
        }
    }


    // Logout current user
    const handleLogout = async () => {

        setLoading(true)

        try {

            // Call logout API
            await logout()

            // Remove user from global state
            setUser(null)

        } catch (err) {

        } finally {

            setLoading(false)
        }
    }


    // Runs once when app loads
    useEffect(() => {

        // Check if user is already logged in
        const getAndSetUser = async () => {

            try {

                // Fetch current user from backend
                const data = await getMe()

                // Restore user after page refresh
                setUser(data.user)

            } catch (err) {

            } finally {

                // Authentication check completed
                setLoading(false)
            }
        }

        getAndSetUser()

    }, [])


    // Expose auth state and functions
    return {

        user,
        loading,

        handleLogin,
        handleRegister,
        handleLogout
    }
}