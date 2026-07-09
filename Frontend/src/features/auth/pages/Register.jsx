import React, { useState } from 'react'
import { useNavigate,Link } from 'react-router-dom'
import "../auth.form.scss"
import { useAuth } from '../hooks/useAuth'

const Register = () => {

    // Hook used for navigation between routes
    const navigate = useNavigate()

    // State for storing username input
    const [ username,setUsername ] = useState("")

    // State for storing email input
    const [ email,setEmail ]  =useState("")

    // State for storing password input
    const [ password,setPassword ]  =useState("")

    // Get loading state and register function from custom auth hook
    const { loading,handleRegister } = useAuth()

    // Runs when form is submitted
    const handleSubmit = async(e) => {

      // Prevent page refresh
      e.preventDefault()

      try {
          await handleRegister({username,email,password})
          navigate("/")
      } catch (error) {
          console.error(error)
          alert('Registration failed. Please check your inputs.')
      }
    }

  return (
    <main>
        <div className="form-container">

            {/* Page Heading */}
            <h1>Register</h1>

            {/* Registration Form */}
            <form onSubmit={handleSubmit}>

                {/* Username Input Group */}
                <div className="input-group">
                    <label htmlFor="username">Username</label>

                    <input
                        value={username}
                        // Update username state while typing
                        onChange={(e) => { setUsername(e.target.value) }}

                        type="text"
                        id="username"
                        name='username'
                        placeholder='Enter username'
                        required
                    />
                </div>

                {/* Email Input Group */}
                <div className="input-group">
                    <label htmlFor="email">Email</label>

                    <input
                        value={email}
                        // Update email state while typing
                        onChange={(e) => { setEmail(e.target.value) }}

                        type="email"
                        id="email"
                        name='email'
                        placeholder='Enter email address'
                        required
                    />
                </div>

                {/* Password Input Group */}
                <div className="input-group">
                    <label htmlFor="password">Password</label>

                    <input
                         value={password}
                         // Update password state while typing
                         onChange={(e) => { setPassword(e.target.value) }}

                         type="password"
                         id="password"
                         name="password"
                         placeholder='Enter password'
                         required
                    />
                </div>

                {/* Submit Button */}
                <button className="button primary-button">
                    Register
                </button>

            </form>

            {/* Navigate to Login Page */}
            <p>
                Already have an account?
                <Link to={"/login"} >Login</Link>
            </p>

        </div>
    </main>
  )
}

export default Register