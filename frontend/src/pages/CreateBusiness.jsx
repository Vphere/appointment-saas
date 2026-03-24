import { useState } from "react";
import api from "../api/axios";

function CreateBusiness() {

    const [form, setForm] = useState({
        name: "",
        description: "",
        address: "",
        city: "",
        phone: ""
    });

    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async () => {
        try {
            const res = await api.post("/api/business", form);
            alert("Created! Status: " + res.data.status);
        } 
        catch{
            alert("Error creating business");
        }
    };

    return (
        <div>
            <h2>Create Business</h2>

            <input name="name" placeholder="Name" onChange={handleChange}/>
            <input name="description" placeholder="Description" onChange={handleChange}/>
            <input name="address" placeholder="Address" onChange={handleChange}/>
            <input name="city" placeholder="City" onChange={handleChange}/>
            <input name="phone" placeholder="Phone" onChange={handleChange}/>

            <button onClick={handleSubmit}>Create</button>
        </div>
    );
}

export default CreateBusiness;