import { useState } from "react";
import api from "../api/axios";

function BusinessReviews() {

    const [reviews, setReviews] = useState([]);
    const [businessId, setBusinessId] = useState("");

    const loadReviews = async () => {
        try {
            const res = await api.get(`/api/reviews/business/${businessId}`);
            setReviews(res.data);
        } catch {
            alert("Error loading reviews");
        }
    };

    return (
        <div style={styles.container}>
            <h2>Business Reviews</h2>

            <input
                placeholder="Business ID"
                onChange={(e) => setBusinessId(e.target.value)}
            />

            <button onClick={loadReviews}>Load</button>

            {reviews.map(r => (
                <div key={r.id} style={styles.card}>
                    <p><b>Rating:</b> {r.rating} ⭐</p>
                    <p>{r.comment}</p>
                </div>
            ))}
        </div>
    );
}

export default BusinessReviews;

const styles = {
    container: { maxWidth: "600px", margin: "auto" },
    card: {
        border: "1px solid #ddd",
        padding: "10px",
        marginTop: "10px",
        borderRadius: "8px"
    }
};