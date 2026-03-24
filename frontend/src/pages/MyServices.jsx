import { useEffect, useState } from "react";
import api from "../api/axios";

function MyServices() {

    const [services, setServices] = useState([]);
    const [businesses, setBusinesses] = useState([]);
    const [selectedBusiness, setSelectedBusiness] = useState("");

    // Load owner's businesses
    useEffect(() => {
        api.get("/api/business/my")
            .then(res => setBusinesses(res.data))
            .catch(() => alert("Error loading businesses"));
    }, []);

    // Fetch services when business changes
    const fetchServices = (businessId) => {
        api.get(`/api/services/business/${businessId}`)
            .then(res => setServices(res.data))
            .catch(() => alert("Error fetching services"));
    };

    const handleBusinessChange = (e) => {
        const id = e.target.value;
        setSelectedBusiness(id);
        fetchServices(id);
    };

    const deleteService = async (id) => {
        try {
            await api.delete(`/api/services/${id}`);
            fetchServices(selectedBusiness);
        } catch {
            alert("Delete failed");
        }
    };

    return (
        <div>
            <h2>My Services</h2>

            {/* Dropdown */}
            <select onChange={handleBusinessChange}>
                <option value="">Select Business</option>
                {businesses.map((b) => (
                    <option key={b.id} value={b.id}>
                        {b.name} ({b.status})
                    </option>
                ))}
            </select>

            {/* Services */}
            {services.map((s) => (
                <div key={s.id}>
                    <h3>{s.name}</h3>
                    <p>{s.description}</p>
                    <p>₹ {s.price}</p>
                    <p>{s.duration} min</p>

                    <button onClick={() => deleteService(s.id)}>Delete</button>
                </div>
            ))}
        </div>
    );
}

export default MyServices;