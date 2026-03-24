import { useState, useEffect } from "react";
import api from "../../api/axios";

function WorkingHours() {

    const [businesses, setBusinesses] = useState([]);
    const [form, setForm] = useState({
        businessId: "",
        dayOfWeek: "MONDAY",
        startTime: "",
        endTime: ""
    });

    // Load owner's businesses
    useEffect(() => {
        api.get("/api/business/my")
            .then(res => setBusinesses(res.data))
            .catch(() => alert("Error loading businesses"));
    }, []);

    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async () => {
        try {
            await api.post("/api/working-hours", form);
            alert("Working hours saved");
        } catch (err) {
            console.log(err);
            alert("Error saving working hours");
        }
    };

    return (
        <div>
            <h2>Set Working Hours</h2>

            {/* Business */}
            <select name="businessId" onChange={handleChange}>
                <option>Select Business</option>
                {businesses.map(b => (
                    <option key={b.id} value={b.id}>
                        {b.name}
                    </option>
                ))}
            </select>

            {/* Day */}
            <select name="dayOfWeek" onChange={handleChange}>
                <option>MONDAY</option>
                <option>TUESDAY</option>
                <option>WEDNESDAY</option>
                <option>THURSDAY</option>
                <option>FRIDAY</option>
                <option>SATURDAY</option>
                <option>SUNDAY</option>
            </select>

            {/* Time */}
            <input type="time" name="startTime" onChange={handleChange} />
            <input type="time" name="endTime" onChange={handleChange} />

            <button onClick={handleSubmit}>
                Save
            </button>
        </div>
    );
}

export default WorkingHours;