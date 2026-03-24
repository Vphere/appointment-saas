import { useState } from "react";
import api from "../api/axios";

function CreateReview() {

    const [businessId, setBusinessId] = useState("");
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState("");

    const submitReview = async () => {

        if (!businessId) {
            alert("Please enter valid Business ID");
            return;
        }

        try {
            await api.post("/api/reviews", {
                businessId,
                rating,
                comment
            });

            alert("Review submitted!");
        } catch (err) {
            console.log(err.response);
            alert("Failed: " + err.response?.data);
        }
    };

    return (
        <div style={styles.container}>
            <h2>Give Review</h2>

            <input
                placeholder="Business ID"
                onChange={(e) => setBusinessId(Number(e.target.value))}
            />

            <select onChange={(e) => setRating(e.target.value)}>
                <option value={5}>5 ⭐</option>
                <option value={4}>4 ⭐</option>
                <option value={3}>3 ⭐</option>
                <option value={2}>2 ⭐</option>
                <option value={1}>1 ⭐</option>
            </select>

            <textarea
                placeholder="Write your review"
                onChange={(e) => setComment(e.target.value)}
            />

            <button onClick={submitReview}>Submit</button>
        </div>
    );
}

export default CreateReview;

const styles = {
    container: {
        maxWidth: "400px",
        margin: "auto",
        display: "flex",
        flexDirection: "column",
        gap: "10px"
    }
};