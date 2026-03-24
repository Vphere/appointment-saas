import { useState } from "react";
import api from "../api/axios";

function AddService() {

    const [form, setForm] = useState({
        name: "",
        description: "",
        price: "",
        duration: "",
        businessId: ""
    });

    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async () => {
        try {
            await api.post("/api/services", form);
            alert("Service added successfully");
        } 
        catch (err) {
            console.log(err);
            alert("Error adding service");
        }
    };

    return (
        <div>
            <h2>Add Service</h2>

            <input name="name" placeholder="Service Name" onChange={handleChange}/>
            <input name="description" placeholder="Description" onChange={handleChange}/>
            <input name="price" placeholder="Price" onChange={handleChange}/>
            <input name="duration" placeholder="Duration (minutes)" onChange={handleChange}/>
            <input name="businessId" placeholder="Business ID" onChange={handleChange}/>

            <button onClick={handleSubmit}>Add Service</button>
        </div>
    );
}

export default AddService;