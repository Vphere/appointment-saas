import { useState } from "react";
import api from "../api/axios";

function BusinessServices() {

    const [services, setServices] = useState([]);
    const [businessId, setBusinessId] = useState("");

    const fetchServices = () => {
        api.get(`/api/services/business/${businessId}`)
            .then(res => setServices(res.data))
            .catch(() => alert("Error"));
    };

    return (
        <div>
            <h2>Business Services</h2>

            <input placeholder="Enter Business ID" onChange={(e) => setBusinessId(e.target.value)} />
            <button onClick={fetchServices}>View Services</button>

            {services.map((s) => (
                <div key={s.id}>
                    <h3>{s.name}</h3>
                    <p>{s.description}</p>
                    <p>₹ {s.price}</p>
                    <p>Duration: {s.duration} min</p>
                </div>
            ))}
        </div>
    );
}

export default BusinessServices;