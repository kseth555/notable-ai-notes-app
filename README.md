
# 🧠 NOTABLE: The Intelligent Notes-Taking App

> *Where your notes get smarter.*

NOTABLE is a modern, full-stack web application built with the MERN stack, seamlessly integrating **AI-powered features** into your daily note-taking workflow. From **rich-text editing** to **smart summarization** and **academic problem-solving**, NOTABLE is your all-in-one productivity hub.

---

## ✨ Features

- 📝 **Rich-Text Note Creation:** Create beautiful, stylized notes with support for headers, colors, lists, indentation, and more using **Quill.js**.
- 🤖 **AI-Powered Summarization:** Generate concise summaries of your notes (including main points, takeaways, and action items) using **Google Gemini API**.
- 🎓 **AI Question Solver:** Instantly solve academic questions with detailed step-by-step explanations powered by Gemini.
- 💾 **Save AI Responses:** Save summaries or answers directly as editable notes.
- 🔢 **Live Character Counter:** Track character length in real-time while writing notes.
- 🕓 **Auto Metadata:** Automatically log creation and last updated dates for every note.
- 🔍 **Real-Time Search:** Find notes quickly with a clean, responsive search bar.
- 🔐 **Firebase Auth:** Secure user authentication with **Firebase** (email/password login).
- 🌙 **Dark Mode & Responsive UI:** Modern, mobile-friendly interface with smooth transitions and beautiful dark mode.
- 📄 **Export to PDF:** Download your notes as a neatly formatted PDF file.

---

## 🛠️ Tech Stack

### 🔹 Frontend

- **React.js** – UI library  
- **React Router** – Navigation  
- **Axios** – HTTP client  
- **React Quill** – Rich text editor  
- **jsPDF** – PDF generation  
- **CSS** – Custom styling (dark mode, responsiveness)  

### 🔹 Backend

- **Node.js** – Server environment  
- **Express.js** – REST API framework  
- **MongoDB Atlas** – Cloud database  
- **Mongoose** – MongoDB ODM  
- **Firebase Auth** – Secure user authentication  
- **Google Gemini API** – Smart AI features  

---

## 🚀 Getting Started

Follow these steps to set up the project locally.

### 📦 Prerequisites

- [Node.js & npm](https://nodejs.org/)
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- [Firebase](https://firebase.google.com/) project (Web App)
- [Google AI Studio](https://aistudio.google.com/) (Gemini API Key)

---

## ⚙️ Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/notable.git
cd notable
````

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` folder:

```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/<db-name>?retryWrites=true&w=majority
GEMINI_API_KEY=AIzaSy... (your Gemini key)
```

### 3. Frontend Setup

Open a new terminal:

```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend` folder:

```env
REACT_APP_FIREBASE_API_KEY=AIzaSy...
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=1234567890
REACT_APP_FIREBASE_APP_ID=1:1234567890:web:abcdef123456
REACT_APP_API_URL=http://localhost:5000/api
```

---

## ▶️ Running the Application

Open **two terminals** – one for the backend and one for the frontend.

### ➤ Start Backend

```bash
cd backend
npm start
```

Runs on: `http://localhost:5000`

### ➤ Start Frontend

```bash
cd frontend
npm start
```

Runs on: `http://localhost:3000`

Now visit the site, register an account, and start taking intelligent notes!

---

## 📁 Project Structure

```
notable/
├── backend/
│   ├── models/
│   ├── routes/
│   ├── controllers/
│   ├── .env
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── App.js
│   ├── public/
│   ├── .env
│   └── index.html
└── README.md
```

---

## 🛡️ Environment Variables

> ❗ **DO NOT COMMIT `.env` FILES TO GITHUB.**
> Create `.env` files in both `frontend/` and `backend/` directories and include them in `.gitignore`.

---

## 🧪 Future Enhancements

* Tags and folder-based note organization
* Real-time collaborative notes
* AI voice assistant for dictating notes
* User analytics dashboard
* PWA (Progressive Web App) support

---

## 📄 License

This project is licensed under the **MIT License** – see the [LICENSE](./LICENSE) file for details.

---

## 🙏 Acknowledgements

Huge thanks to the creators of:

* [React](https://reactjs.org/)
* [Node.js](https://nodejs.org/)
* [MongoDB](https://www.mongodb.com/)
* [Firebase](https://firebase.google.com/)
* [Google Gemini API](https://aistudio.google.com/)

```

---

### ✅ Now you're good to go!
Paste this into `README.md`, save it, and it’ll render perfectly on GitHub.

Want help adding:
- A **GIF or screenshot** of the app?
- A **badge row** (Tech stack, License, Deployed on, etc.)?
Let me know!
```
