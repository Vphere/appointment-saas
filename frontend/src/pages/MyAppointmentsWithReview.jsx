import { useEffect, useState } from "react";
import api from "../api/axios";

function MyAppointmentsWithReview() {

    const [appointments, setAppointments] = useState([]);
    const [selected, setSelected] = useState(null);
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState("");
    const [reviewedMap, setReviewedMap] = useState({});

    const fetchReviewStatus = async (appointments) => {
        const map = {};

        for (let a of appointments) {
            try {
                const res = await api.get(`/api/reviews/check/${a.id}`);
                map[a.id] = res.data;
            } catch {
                map[a.id] = false;
            }
        }

        setReviewedMap(map);
    };

    // 🔥 Load user appointments
    useEffect(() => {
        const fetchAppointments = async () => {
            try {
                const res = await api.get("/api/appointments/my");
                setAppointments(res.data);
                fetchReviewStatus(res.data);
            } catch {
                alert("Error loading appointments");
            }
        };

        fetchAppointments();
    }, []);

    // 🔥 Submit review
    const submitReview = async () => {
        try {
            await api.post("/api/reviews", {
                appointmentId: selected.id,
                rating,
                comment
            });

            alert("Review submitted!");
            setSelected(null);
            setComment("");

        } catch (err) {
            console.log(err.response);
            alert(err.response?.data || "Failed");
        }
    };

    return (
        <div style={styles.container}>
            <h2>My Appointments</h2>

            {appointments.map(a => (
                <div key={a.id} style={styles.card}>
                    <p><b>Business:</b> {a.businessName}</p>
                    <p><b>Service:</b> {a.serviceName}</p>
                    <p><b>Date:</b> {a.appointmentDate}</p>
                    <p><b>Status:</b> {a.status}</p>

                    {a.status === "COMPLETED" && (
                        reviewedMap[a.id] ? (
                            <span style={{ color: "green" }}>Reviewed ✅</span>
                        ) : (
                            <button
                                style={styles.reviewBtn}
                                onClick={() => setSelected(a)}
                            >
                                Give Review
                            </button>
                        )
                    )}
                </div>
            ))}

            {/* 🔥 REVIEW MODAL */}
            {selected && (
                <div style={styles.modal}>
                    <div style={styles.modalContent}>
                        <h3>Review {selected.businessName}</h3>

                        <div>
                            {[1,2,3,4,5].map(star => (
                                <span
                                    key={star}
                                    style={{
                                        fontSize: "24px",
                                        cursor: "pointer",
                                        color: star <= rating ? "gold" : "gray"
                                    }}
                                    onClick={() => setRating(star)}
                                >
                                    ★
                                </span>
                            ))}
                        </div>

                        <textarea
                            placeholder="Write your review"
                            onChange={(e) => setComment(e.target.value)}
                        />

                        <div style={styles.actions}>
                            <button onClick={submitReview}>Submit</button>
                            <button onClick={() => setSelected(null)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default MyAppointmentsWithReview;



// 🎨 STYLES
const styles = {
    container: {
        maxWidth: "700px",
        margin: "auto",
        padding: "20px"
    },

    card: {
        border: "1px solid #ddd",
        padding: "15px",
        marginBottom: "10px",
        borderRadius: "10px",
        boxShadow: "0 2px 5px rgba(0,0,0,0.1)"
    },

    reviewBtn: {
        marginTop: "10px",
        background: "purple",
        color: "white",
        border: "none",
        padding: "6px 10px",
        cursor: "pointer",
        borderRadius: "5px"
    },

    modal: {
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center"
    },

    modalContent: {
        background: "white",
        padding: "20px",
        borderRadius: "10px",
        width: "300px",
        display: "flex",
        flexDirection: "column",
        gap: "10px"
    },

    actions: {
        display: "flex",
        justifyContent: "space-between"
    }
};