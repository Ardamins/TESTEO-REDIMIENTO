# Inventory Management Dashboard 
Inventory Management Dashboard 

This project is a **full-stack web application** built with React (frontend) and Node.js + Express + MongoDB (backend). It provides a complete solution for managing products, invoices, and user authentication with drag-and-drop enabled dashboards and statistics.

---

⚠️ Note: After starting the project, please allow up to 30 seconds for the backend services to initialize and fetch data from the database. The website may take a short time before displaying the content properly.

---

## ⚙️ Setup Instructions

### 1️⃣ Clone or Download Repository

* Download the repository as a **ZIP folder** and extract it.
* Or, clone it using the following command:

```bash
git clone <repository-url>
```

### 2️⃣ Backend Setup

1. Open the project folder in **VS Code**.
2. Navigate to the **BackEnd** directory:

```bash
cd BackEnd
```

3. Install dependencies:

```bash
npm install
```

4. Start the backend server:

```bash
npm run server
```

### 3️⃣ Frontend Setup

1. Navigate to the **FrontEnd** directory:

```bash
cd FrontEnd
```

2. Install dependencies:

```bash
npm install
```

3. Start the frontend development server:

```bash
npm run dev
```

---

## 🚀 Features Implemented

### 🔐 Authentication

* **User Registration**
* **Login**
* **Forgot Password** with OTP sent from `p21566581@gmail.com`.

  * Enter your registered email → receive OTP → enter OTP → reset password.

### 📊 Dashboard

* Drag-and-drop enabled dashboard for widgets and stats.

### 📦 Products

* **Add Single Product** (with image upload).
* **Add Multiple Products** via CSV upload.
* Automatic product statistics update after adding products.
* Pagination in product table.

### 🧾 Invoices

* Invoice statistics update dynamically when invoices are **deleted** or **paid**.
* Features:

  * **Delete Invoice**
  * **Pay Invoice**
  * **View Invoice**
  * **Download Invoice**
  * **Print Invoice**
* Pagination in invoice table.

### 📌 Statistics Page

* Drag-and-Drop Interface - Customizable statistics layout
* Interactive Charts - Visual data representation
* Top Products - Visual data representation

### ⚙️ Settings

* Admin can update credentials.
* After updating, the admin is **automatically logged out** for security.

---

📱 Mobile Layout

A fully responsive mobile layout has been built for the entire application as per the provided Figma design.
Mobile Screen Size - 380px X 800px

---

CSV Used for the testing - https://drive.google.com/file/d/1Ani-P1Khc3hiL7ueLevcQTsCCh9B4Wc2/view?usp=sharing

---

Working Url - https://inventory-management-dashboard-50k8.onrender.com
