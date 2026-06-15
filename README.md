# Appointment Booking SaaS Platform

A full-stack multi-tenant SaaS platform that enables businesses to manage services, schedules, appointments, payments, and customer interactions while allowing customers to seamlessly discover businesses and book appointments online.

The platform supports multiple independent businesses operating within a single application through secure role-based access control, appointment management, payment processing, cloud-based media storage, and transactional email notifications.

Built using React, Spring Boot, Spring Security, JWT Authentication, MySQL, Cloudinary, Razorpay, and Brevo.

---

## ⭐ Highlights

* Multi-Tenant SaaS Architecture
* JWT Access Token + Refresh Token Authentication
* Google OAuth2 Login
* Role-Based Access Control (Admin, Business Owner, Customer)
* Razorpay Payment Integration
* Brevo Transactional Email Integration
* Cloudinary Media Storage
* Spring Security & BCrypt Password Encryption
* RESTful API Architecture
* Production Deployment on Vercel, Render, and Railway

---

## 🚀 Key Features

### Authentication & Security

* JWT Access Token Authentication
* Refresh Token Authentication
* Google OAuth2 Login
* Spring Security Integration
* Role-Based Access Control (RBAC)
* BCrypt Password Encryption
* HttpOnly Cookie Support
* Secure Protected APIs

### Customer Features

* User Registration & Login
* Browse Businesses and Services
* Real-Time Appointment Booking
* Reschedule or Cancel Appointments
* View Appointment History
* Profile Management
* Submit Ratings and Reviews

### Business Owner Features

* Business Registration & Management
* Service Management
* Service Image Uploads
* Working Hours Configuration
* Holiday & Availability Management
* Approve or Reject Appointments
* Revenue Dashboard & Analytics

### Appointment Management

* Real-Time Slot Availability
* Appointment Scheduling
* Appointment Conflict Prevention
* Appointment Status Tracking
* Cancellation & Rescheduling Support

### Payments

* Razorpay Integration
* Advance Payment Collection
* Refund Workflow Support
* Secure Online Transactions

### Notifications

* Transactional Email Notifications
* Appointment Confirmations
* Appointment Status Updates
* User Registration Emails
* Brevo Email API Integration
* Optional RabbitMQ-Based Email Queue Processing

### Media Management

* Cloudinary Image Storage
* Document Upload Support
* Secure Cloud-Based File Management

---

## 🏗️ Architecture

```text
Customer
    │
    ▼
React + Vite Frontend (Vercel)
    │
    ▼
Spring Boot REST API (Render)
    │
 ┌──┼──────────┬──────────┬─────────┐
 ▼  ▼          ▼          ▼         ▼
MySQL     Cloudinary    Brevo   Razorpay
(Railway)
```

---

## 🛠️ Tech Stack

### Frontend

* React.js
* Vite
* React Router
* Axios
* CSS

### Backend

* Java 17+
* Spring Boot
* Spring Security
* Spring Data JPA
* Hibernate
* Maven

### Database

* MySQL

### Authentication

* JWT Access Tokens
* Refresh Tokens
* Google OAuth2
* BCrypt

### Third-Party Services

* Cloudinary
* Razorpay
* Brevo

### Deployment

* Vercel (Frontend)
* Render (Backend)
* Railway (Database)

---

## 👥 User Roles

### CUSTOMER

* Browse Services
* Book Appointments
* Reschedule / Cancel Appointments
* Manage Bookings
* Submit Reviews

### BUSINESS_OWNER

* Manage Business Profile
* Manage Services
* Manage Appointments
* Manage Availability
* View Revenue Analytics

### ADMIN

* Manage Users
* Verify Businesses
* Monitor Platform Activity
* Moderate Reviews

---

## 🔄 Authentication Flow

```text
Login
  │
  ▼
Access Token + Refresh Token Generated
  │
  ▼
Access Token Used For API Requests
  │
  ▼
Access Token Expires
  │
  ▼
Refresh Token Generates New Access Token
  │
  ▼
User Continues Without Re-Authentication
```

---

## 📋 Appointment Lifecycle

```text
PENDING
   │
   ▼
CONFIRMED
   │
   ▼
COMPLETED
```

Additional States:

```text
CANCELLED
REJECTED
```

---

## 📂 Project Structure

```text
appointment-saas
│
├── frontend/                 # React + Vite Frontend
│
├── src/                      # Spring Boot Application
│   ├── main/
│   └── test/
│
├── uploads/
├── Dockerfile
├── pom.xml
├── mvnw
├── mvnw.cmd
└── README.md
```

---

## ⚙️ Configuration

### Backend Environment Variables

The application uses environment variables referenced inside `application.properties`.

```properties
MYSQL_URL=
MYSQL_USER=
MYSQL_PASSWORD=

JWT_SECRET=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

MAIL_PROVIDER=
MAIL_USERNAME=
MAIL_PASSWORD=

BREVO_API_KEY=
MAIL_FROM_ADDRESS=
MAIL_FROM_NAME=

RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

FRONTEND_URL=
```

### Frontend (.env)

```env
VITE_API_BASE_URL=
```

---

## 🚀 Running Locally

### Clone Repository

```bash
git clone https://github.com/Vphere/appointment-saas.git
cd appointment-saas
```

### Backend Setup

```bash
mvn clean install
mvn spring-boot:run
```

Backend runs on:

```text
http://localhost:8080
```

### Frontend Setup

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on:

```text
http://localhost:5173
```

---

## 🐳 Docker Support

Build Docker Image:

```bash
docker build -t appointment-saas .
```

Run Container:

```bash
docker run -p 8080:8080 appointment-saas
```

---

## 📈 Planned Improvements

* Redis / Caffeine Caching
* AWS Deployment
* Enhanced Monitoring & Logging
* User Dispute management

---

## 📄 License

This project is developed for educational, portfolio, and demonstration purposes.

---

## 👨‍💻 Author

**Vaidikkumar Patel**

Full Stack Developer specializing in Java, Spring Boot, React, REST APIs, Authentication & Authorization, and Cloud-Native Applications.

Feel free to raise issues, submit pull requests, or share suggestions.
