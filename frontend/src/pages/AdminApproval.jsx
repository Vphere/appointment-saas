import { useEffect, useState } from "react";
import api from "../api/axios";

function AdminApproval() {

    const [businesses, setBusinesses] = useState([]);

    const fetchData = () => {
        api.get("/api/business/all")
            .then(res => setBusinesses(res.data))
            .catch(() => alert("Error"));
    };

    useEffect(() => {
        fetchData();
    }, []);

    const updateStatus = async (id, status) => {
        try {
            await api.put(`/api/business/${id}/${status}`);
            fetchData();
        } catch {
            alert("Error updating");
        }
    };

    return (
        <div>
            <h2>Admin Panel</h2>

            {businesses.map((b) => (
                <div key={b.id}>
                    <h3>{b.name}</h3>
                    <p>Status: {b.status}</p>

                    {b.status === "PENDING" && (
                        <>
                            <button onClick={() => updateStatus(b.id, "APPROVED")}>
                                Approve
                            </button>

                            <button onClick={() => updateStatus(b.id, "REJECTED")}>
                                Reject
                            </button>
                        </>
                    )}
                </div>
            ))}
        </div>
    );
}

export default AdminApproval;