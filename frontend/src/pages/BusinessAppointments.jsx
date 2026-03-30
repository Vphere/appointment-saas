import { useEffect, useState } from "react";
import api from "../api/axios";

function BusinessAppointments() {

    const [appointments, setAppointments] = useState([]);
    const [filter, setFilter] = useState("ALL");

    // 🔥 Fetch appointments (AUTO for logged-in owner)
    useEffect(() => {
        const fetchAppointments = async () => {
            try {
                const res = await api.get("/api/appointments/my-business");
                setAppointments(res.data);
            } catch (err) {
                console.log(err.response);
                alert("Error loading appointments");
            }
        };

        fetchAppointments();
    }, []);

    // 🔥 Update status (Confirm / Reject / Complete)
    const updateStatus = async (id, status) => {
        try {
            // Temporarily use debug endpoint to isolate auth issue
            await api.put(`/api/appointments/${id}/status-debug`, {
                status: status
            });

            // refresh data without reload
            const res = await api.get("/api/appointments/my-business");
            setAppointments(res.data);

        } catch (err) {
            console.error('Update error:', err.response?.data || err.message);
            const errorMessage = err.response?.data?.message || 
                               err.response?.data || 
                               err.message || 
                               'Action failed';
            alert(`Failed to ${status.toLowerCase()} appointment: ${errorMessage}`);
        }
    };

    // 🔥 FILTER LOGIC
    const filteredAppointments =
        filter === "ALL"
            ? appointments
            : appointments.filter(a => a.status === filter);

    // 🔥 STATS
    const total = appointments.length;
    const pending = appointments.filter(a => a.status === "PENDING").length;
    const confirmed = appointments.filter(a => a.status === "CONFIRMED").length;
    const completed = appointments.filter(a => a.status === "COMPLETED").length;
    const cancelled = appointments.filter(a => a.status === "CANCELLED").length;

    return (
        <div style={styles.container}>
            <h2>My Business Appointments</h2>

            {/* 🔥 DASHBOARD STATS */}
            <div style={styles.stats}>
                <div>Total: {total}</div>
                <div>Pending: {pending}</div>
                <div>Confirmed: {confirmed}</div>
                <div>Completed: {completed}</div>
                <div>Cancelled: {cancelled}</div>
            </div>

            {/* 🔥 FILTER BUTTONS */}
            <div style={styles.filters}>
                <button onClick={() => setFilter("ALL")}>All</button>
                <button onClick={() => setFilter("PENDING")}>Pending</button>
                <button onClick={() => setFilter("CONFIRMED")}>Confirmed</button>
                <button onClick={() => setFilter("COMPLETED")}>Completed</button>
                <button onClick={() => setFilter("CANCELLED")}>Cancelled</button>
            </div>

            {/* 🔥 APPOINTMENT LIST */}
            {filteredAppointments.length === 0 ? (
                <p>No appointments found</p>
            ) : (
                filteredAppointments.map(a => (
                    <div key={a.id} style={styles.card}>

                        <p><b>Business:</b> {a.businessName}</p>
                        <p><b>Service:</b> {a.serviceName}</p>
                        <p><b>Date:</b> {a.appointmentDate}</p>
                        <p><b>Time:</b> {a.appointmentTime?.slice(0, 5)}</p>
                        <p><b>Customer:</b> {a.userName || a.userEmail || `User #${a.userId}`}</p>
                        <p><b>Status:</b> {a.status}</p>
                        {a.price && <p><b>Price:</b> ₹{a.price}</p>}

                        <div style={styles.actions}>

                            {/* PENDING ACTIONS */}
                            {a.status === "PENDING" && (
                                <>
                                    <button
                                        style={styles.confirm}
                                        onClick={() => updateStatus(a.id, "CONFIRMED")}
                                    >
                                        Confirm
                                    </button>

                                    <button
                                        style={styles.reject}
                                        onClick={() => updateStatus(a.id, "CANCELLED")}
                                    >
                                        Reject
                                    </button>
                                </>
                            )}

                            {/* CONFIRMED ACTION */}
                            {a.status === "CONFIRMED" && (
                                <button
                                    style={styles.complete}
                                    onClick={() => updateStatus(a.id, "COMPLETED")}
                                >
                                    Mark Completed
                                </button>
                            )}

                            {/* CANCELLED - NO ACTIONS */}
                            {a.status === "CANCELLED" && (
                                <span style={styles.cancelledBadge}>Cancelled</span>
                            )}

                        </div>
                    </div>
                ))
            )}
        </div>
    );
}

export default BusinessAppointments;

// 🎨 STYLES
const styles = {
    container: {
        maxWidth: "800px",
        margin: "auto",
        padding: "20px"
    },

    stats: {
        display: "flex",
        justifyContent: "space-around",
        marginBottom: "20px",
        padding: "10px",
        background: "#f5f5f5",
        borderRadius: "10px",
        fontWeight: "bold"
    },

    filters: {
        display: "flex",
        gap: "10px",
        marginBottom: "20px",
        justifyContent: "center"
    },

    card: {
        border: "1px solid #ddd",
        padding: "15px",
        marginBottom: "15px",
        borderRadius: "12px",
        background: "#fff",
        boxShadow: "0 4px 10px rgba(0,0,0,0.1)"
    },

    actions: {
        marginTop: "10px",
        display: "flex",
        gap: "10px"
    },

    confirm: {
        backgroundColor: "green",
        color: "white",
        padding: "6px 12px",
        border: "none",
        cursor: "pointer",
        borderRadius: "5px"
    },

    reject: {
        backgroundColor: "red",
        color: "white",
        padding: "6px 12px",
        border: "none",
        cursor: "pointer",
        borderRadius: "5px"
    },

    complete: {
        backgroundColor: "blue",
        color: "white",
        padding: "6px 12px",
        border: "none",
        cursor: "pointer",
        borderRadius: "5px"
    },

    cancelledBadge: {
        backgroundColor: "#ff6b6b",
        color: "white",
        padding: "4px 8px",
        borderRadius: "4px",
        fontSize: "12px",
        fontWeight: "bold"
    }
};