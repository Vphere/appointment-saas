import { useEffect, useState } from "react";
import api from "../../api/axios";

function SlotBooking() {

    const [businesses, setBusinesses] = useState([]);
    const [services, setServices] = useState([]);
    const [slots, setSlots] = useState([]);

    const [selectedBusiness, setSelectedBusiness] = useState("");
    const [selectedService, setSelectedService] = useState("");
    const [date, setDate] = useState("");

    // Load approved businesses
    useEffect(() => {
        api.get("/api/business/approved")
            .then(res => {
                const approved = res.data.filter(b => b.status === "APPROVED");
                setBusinesses(approved);
            })
            .catch(() => alert("Error loading businesses"));
    }, []);

    // Load services when business selected
    const handleBusinessChange = (e) => {
        const id = e.target.value;
        setSelectedBusiness(id);

        api.get(`/api/services/business/${id}`)
            .then(res => setServices(res.data))
            .catch(() => alert("Error loading services"));
    };

    // Fetch slots
    const fetchSlots = () => {

        if (!selectedBusiness || !selectedService || !date) {
            alert("Please select all fields");
            return;
        }

        const service = services.find(s => s.id == selectedService);

        api.get(`/api/slots`, {
            params: {
                businessId: selectedBusiness,
                date: date,
                duration: service.duration
            }
        })
        .then(res => setSlots(res.data))
        .catch(() => alert("Error fetching slots"));
    };

    const bookAppointment = async (time) => {
        try {
            await api.post("/api/appointments", {
                businessId: selectedBusiness,
                serviceId: selectedService,
                appointmentDate: date,
                appointmentTime: time
            });

            alert("Appointment booked successfully");
            fetchSlots();

        } catch (err) {
            console.log(err);
            alert("Booking failed");
        }
    };

    return (
        <div>
            <h2>Book Appointment</h2>

            {/* Business Dropdown */}
            <select onChange={handleBusinessChange}>
                <option>Select Business</option>
                {businesses.map(b => (
                    <option key={b.id} value={b.id}>
                        {b.name}
                    </option>
                ))}
            </select>

            {/* Service Dropdown */}
            <select onChange={(e) => setSelectedService(e.target.value)}>
                <option>Select Service</option>
                {services.map(s => (
                    <option key={s.id} value={s.id}>
                        {s.name} ({s.duration} min)
                    </option>
                ))}
            </select>

            {/* Date */}
            <input type="date" onChange={(e) => setDate(e.target.value)} />

            {/* Button */}
            <button onClick={fetchSlots}>
                Check Availability
            </button>

            {/* Slots */}
            <div>
                <h3>Available Slots</h3>

                {slots.length === 0 && <p>No slots available</p>}
                {slots.map((slot, index) => (
                    <button key={index} onClick={() => bookAppointment(slot.time)}>
                        {slot.time}
                    </button>
                ))}
            </div>
        </div>
    );
}

export default SlotBooking;