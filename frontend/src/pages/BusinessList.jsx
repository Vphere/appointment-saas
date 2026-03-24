import { useEffect, useState } from "react";
import api from "../api/axios";

function BusinessList() {

    const [businesses, setBusinesses] = useState([]);
    const [ratings, setRatings] = useState({}); // 🔥 store rating per business

    // 🔥 Fetch ratings for each business
    const fetchRatings = async (businessList) => {
        const map = {};

        for (let b of businessList) {
            try {
                const res = await api.get(`/api/reviews/avg/${b.id}`);
                map[b.id] = res.data;
            } catch {
                map[b.id] = null;
            }
        }

        setRatings(map);
    };

    // 🔥 Load businesses
    useEffect(() => {
        api.get("/api/business/approved")
            .then(res => {
                setBusinesses(res.data);
                fetchRatings(res.data); // 👈 load ratings after businesses
            })
            .catch(() => alert("Error loading businesses"));
    }, []);

    return (
        <div style={styles.container}>
            <h2>Businesses</h2>

            {businesses.map((b) => (
                <div key={b.id} style={styles.card}>
                    <h3>{b.name}</h3>
                    <p>{b.description}</p>
                    <p>{b.city}</p>

                    {/* ⭐ SHOW RATING PER BUSINESS */}
                    <p>
                        Rating: {
                            ratings[b.id]
                                ? ratings[b.id].toFixed(1)
                                : "No ratings"
                        } ⭐
                    </p>
                </div>
            ))}

        </div>
    );
}

export default BusinessList;


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
    }
};