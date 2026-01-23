# Digital Invoice Generator

A **production-ready full-stack MERN application** that enables businesses to securely create, manage, and send professional invoices end-to-end — from client onboarding to PDF/email delivery and reporting.

🔗 **Deployment Links**  
- Live Application: https://digital-invoice-generator-hprm.vercel.app  
- Server API Status: https://digital-invoice-generator.onrender.com  

---

## 🚀 Key Features

- **Secure Authentication & Authorization**  
  JWT-based login with strict data isolation — users can access only their own invoices, clients, and items.

- **Invoice & Client Management**  
  Create, update, and manage clients, reusable items, and itemized invoices with status tracking (Draft / Sent / Paid).

- **Server-Side PDF Generation**  
  Generate and download professional invoices as PDFs directly from the backend.

- **Email Invoice Delivery**  
  Send invoices to clients via email with PDF attachments and delivery history tracking.

- **Reporting Dashboard**  
  View invoice summaries and status-based insights with CSV export support.

- **Live Currency Conversion**  
  Base currency stored in INR with real-time FX conversion for UI display, PDF exports, and emails.

- **Responsive UI**  
  Clean, modern interface with light/dark mode and smooth animations.

---

## 🛠 Tech Stack

**Frontend**
- React (Vite)
- Tailwind CSS
- Framer Motion
- React Router

**Backend**
- Node.js
- Express (REST API)
- MongoDB
- Mongoose
- JWT Authentication
- PDFKit
- Nodemailer

**Deployment**
- Frontend: Vercel  
- Backend: Render  

---

## 🏗 System Architecture

The application follows a **Monolithic Full-Stack** design:
* **State Management:** Custom logic manages authentication tokens and currency persistence via `localStorage`.
* **Server-Side Logic:** PDFs are generated in-memory and streamed to the client or attached directly to outgoing emails to minimize disk usage.
* **Database Design:** Relational-style modeling in MongoDB connecting Invoices to specific Client and User IDs for strict data ownership.


