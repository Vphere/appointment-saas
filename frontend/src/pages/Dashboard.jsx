import { useEffect, useState } from "react";
import api from "../api/axios";
import {Link} from "react-router-dom";

function Dashboard() {
    const [message, setMessage] = useState("");

    useEffect(() => {
        api.get("/api/test/secure")
            .then((res) => setMessage(res.data))
            .catch(() => setMessage("Unauthorized"));
    }, []);

    return (
        <div>
            <h2>Dashboard</h2>
            <p>{message}</p>
            <Link to="/create-business">Create Business</Link><br/>
            <Link to="/admin">Approve pending business requests</Link><br/>
            <Link to="/business-dashboard">Click here to show all businesses</Link>
            <Link to="/business-appointments">Manage Appointments</Link>
        </div>
    );
}

export default Dashboard;