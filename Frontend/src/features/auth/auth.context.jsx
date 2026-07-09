import { createContext, useState } from "react";
import { getMe } from "./services/auth.api";

// Create a global context object
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {

    // Stores logged-in user data
    const [user, setUser] = useState(null);

    // Stores auth loading state
    const [loading, setLoading] = useState(true);

    return (

        // Makes values available globally
        <AuthContext.Provider
            value={{
                user,
                setUser,
                loading,
                setLoading
            }}
        >

            {/* Render wrapped components */}
            {children}

        </AuthContext.Provider>
    );
}