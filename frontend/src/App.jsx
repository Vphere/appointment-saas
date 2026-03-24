import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import BusinessList from "./pages/BusinessList.jsx";
import CreateBusiness from "./pages/CreateBusiness.jsx";
import MyBusinesses from "./pages/BusinessDashboard.jsx";
import AdminApproval from "./pages/AdminApproval.jsx";
import AddService from "./pages/AddService.jsx";
import MyServices from "./pages/MyServices.jsx";
import BusinessServices from "./pages/BusinessServices.jsx";
import SlotBooking from "./pages/slots/SlotBoking.jsx";
import WorkingHours from "./pages/owner/WorkingHours.jsx";
import MyAppointments from "./pages/user/MyAppointments.jsx";
import BusinessDashboard from "./pages/BusinessDashboard.jsx";
import BusinessAppointments from "./pages/BusinessAppointments.jsx";
import CreateReview from "./pages/CreateReview.jsx";
import BusinessReviews from "./pages/BusinessReviews.jsx";
import MyAppointmentsWithReview from "./pages/MyAppointmentsWithReview.jsx";

function App() {

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Login/>} />
                <Route path="/register" element={<Register/>} />
                <Route path="/dashboard" element={
                                                <ProtectedRoute>
                                                    <Dashboard />
                                                </ProtectedRoute>
                                                }
                />

                <Route path="/businesses" element={<BusinessList/>} />
                <Route path="/create-business" element={<CreateBusiness/>} />
                <Route path="/my-businesses" element={<MyBusinesses/>} />
                <Route path="/admin" element={<AdminApproval/>} />

                <Route path="/add-service" element={<AddService/>} />
                <Route path="/my-services" element={<MyServices/>} />
                <Route path="/services" element={<BusinessServices/>} />

                <Route path="/book" element={<SlotBooking/>} />
                <Route path="/working-hours" element={<WorkingHours/>} />
                {/* <Route path="/my-appointments" element={<MyAppointments/>} /> */}
                <Route path="/business-dashboard" element={<BusinessDashboard />} />

                <Route path="/business-appointments" element={<BusinessAppointments/>} />

                <Route path="/review" element={<CreateReview/>} />
                <Route path="/reviews" element={<BusinessReviews/>} />
                <Route path="/my-appointments" element={<MyAppointmentsWithReview/>} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;