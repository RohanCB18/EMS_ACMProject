# Event Management System (EMS) — HackOdyssey

A centralized platform to manage hackathon operations, registrations, judging, and finance.

## 🚀 Quick Start

### 1. Backend Setup (FastAPI)
The backend handles authentication, Firestore integration, and core business logic.

```bash
# Navigate to the backend directory
cd backend

# Create and activate a virtual environment
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the server (on port 8000)
uvicorn app.main:app --reload --port 8000
```
> [!IMPORTANT]
> Ensure you have the `serviceAccountKey.json` file in the `backend/` root directory for Firebase access.

### 2. Frontend Setup (Next.js)
The frontend provides the participant and admin dashboards.

```bash
# Navigate to the frontend directory
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 🛠 Project Structure
- **/frontend**: Next.js application (App Router)
- **/backend/app**: Unified FastAPI application with role-based routing
- **/backend/aditya, /backend/rohan, etc**: Individual developer workspace folders (deprecated in favor of `/app`)


Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
