import { useState } from "react";
import api from "../api/axios";

function BusinessDashboard() {

    const [businessId, setBusinessId] = useState("");
    const [data, setData] = useState(null);

    const loadDashboard = async () => {
        try {
            const res = await api.get(`/api/dashboard/business/${businessId}`);
            setData(res.data);
        } catch {
            alert("Error loading dashboard");
        }
    };

    return (
        <div>
            <h2>Business Dashboard</h2>

            <input
                placeholder="Enter Business ID"
                onChange={(e) => setBusinessId(e.target.value)}
            />

            <button onClick={loadDashboard}>Load</button>

            {data && (
                <div>
                    <p>Total Bookings: {data.totalBookings}</p>
                    <p>Pending: {data.pendingBookings}</p>
                    <p>Completed: {data.completedBookings}</p>
                    <p>Total Services: {data.totalServices}</p>
                </div>
            )}
        </div>
    );
}

export default BusinessDashboard;