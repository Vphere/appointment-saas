import { useState } from "react";
import {Link, useNavigate} from "react-router-dom";
import api from "../api/axios";
import "../styles/Auth.css"

function Register() {

    const navigate = useNavigate();

    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
        role: "CUSTOMER"
    });

    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value
        });
    };

    const handleRegister = async () => {
        try {
            await api.post("/api/auth/register", form);

            alert("Registration successful");
            navigate("/");
        }
        catch {
            alert("Registration failed");
        }
    };

    return (
        <div className="auth-container">

            <div className="auth-card">
                <h2>Register</h2>

                <input className="auth-input" name="name"
                    placeholder="Name" onChange={handleChange} />

                <input className="auth-input" name="email"
                    placeholder="Email" onChange={handleChange} />

                <input className="auth-input" name="password" type="password"
                    placeholder="Password" onChange={handleChange} />

                <select className="auth-input" name="role" onChange={handleChange}>
                    <option value="CUSTOMER">Customer</option>
                    <option value="BUSINESS_OWNER">Business Owner</option>
                </select>

                <button className="auth-btn" onClick={handleRegister}>
                    Register
                </button>

                <div className="auth-link">
                    Already have an account? <Link to="/">Login</Link>
                </div>
            </div>
        </div>
    );
}
export default Register;