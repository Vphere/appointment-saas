import { useEffect, useState } from "react";
import api from "../../api/axios";

function MyAppointments() {

    const [appointments, setAppointments] = useState([]);

    useEffect(() => {
        api.get("/api/appointments/my")
            .then(res => setAppointments(res.data))
            .catch(() => alert("Error loading appointments"));
    }, []);

    const cancelAppointment = async (id) => {
        try {
            await api.put(`/api/appointments/${id}/cancel`);
            alert("Cancelled");
            window.location.reload();
        } catch {
            alert("Cancel failed");
        }
    };

    return (
        <div>
            <h2>My Appointments</h2>

            {appointments.map(a => (
                <div key={a.id}>
                    <p>Business ID: {a.businessId}</p>
                    <p>Service ID: {a.serviceId}</p>
                    <p>Date: {a.appointmentDate}</p>
                    <p>Time: {a.appointmentTime}</p>
                    <p>Status: {a.status}</p>
                    <button onClick={() => cancelAppointment(a.id)}>
                        Cancel
                    </button>
                </div>
            ))}
        </div>
    );
}

export default MyAppointments;