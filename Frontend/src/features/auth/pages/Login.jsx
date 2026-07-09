import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import "../auth.form.scss"
import { useAuth } from '../hooks/useAuth.js'

const Login = () => {
    const { loading, handleLogin } = useAuth()
    const navigate = useNavigate();

//Step 1: Create storage, intially empty
    const [ email, setEmail ] = useState("")
    const [ password, setPassword ] = useState("")
    
    const handleSubmit = async (e) => {

        // Prevent browser's default form submission
        // (avoids page refresh)
        e.preventDefault()

        try {
            await handleLogin({
                email,
                password
            })
            navigate('/')
        } catch (error) {
            console.error(error)
            alert('Login failed. Check your email and password.')
        }
    }

    if(loading){
        return (<main><h1>Loading.......</h1></main>)
    }
  return (
    <main>
        <div className="form-container">
            <h1>Login</h1>
            <form onSubmit={handleSubmit}>
                <div className="input-group">
                    <label htmlFor="email">Email</label>
                    <input
                        value={email}
                        onChange={(e) => { setEmail(e.target.value) }}
                        type="email" id="email" name='email' placeholder='Enter email address'
                        required />
                </div>

                <div className="input-group">
                    <label htmlFor="password">Password</label>
                    <input
                         value={password}
                         onChange={(e) => { setPassword(e.target.value) }}
                         type="password" id="password" name="password" placeholder='Enter password'
                         required />
                </div>
                <button className="button primary-button">Login</button>
            </form>
            <p>Don't have an account? <Link to={"/register"} >Register</Link> </p>
        </div>
    </main>
  )
}

export default Login