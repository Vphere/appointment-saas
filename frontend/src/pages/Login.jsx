import {useEffect, useState} from "react";
import {Link, useNavigate} from "react-router-dom";
import api from "../api/axios";
import "../styles/Auth.css"

function Login()
{
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    useEffect(() => {
        localStorage.removeItem("token");
    }, []);

    const handleLogin = async () => {
        try {
            const res = await api.post("/api/auth/login", {
                email,
                password
            });

            localStorage.setItem("token", res.data.token);

            navigate("/dashboard");
        }
        catch {
            alert("Invalid credentials");
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>Login</h2>

                <input className="auth-input" placeholder="Email" onChange={(e) => setEmail(e.target.value)} />

                <input className="auth-input" type="password"
                    placeholder="Password" onChange={(e) => setPassword(e.target.value)} />

                <button className="auth-btn" onClick={handleLogin}>
                    Login
                </button>

                <div className="auth-link">
                    Don't have an account? <Link to="/register">Register</Link>
                </div>
            </div>
        </div>
    );
}
export default Login;