# ColdOps

**Project Title and Description**  
ColdOps, A systematic application that is ready to cooperate with Cold-Industry companies and local Warehouse Management Systems owned by them to optimize the electricity usage by industrial coolers.

**Team Name & Team Members**  
**re+start**  
Names: Tan Wee Sheng, Rishikeshan A/L Yogarajah, Chan Young Park

**Technologies used**  
ColdOps is built using a modern, scalable technology stack designed for high performance and real-time responsiveness. The frontend is powered by **Next.js** and **React**, styled beautifully with **Tailwind CSS** and **shadcn/ui** components. For state management and real-time updates, it leverages **Zustand** and **Socket.io**. The backend is a robust combination of **Node.js** (via Next.js API routes) and a dedicated **FastAPI (Python)** server running on Uvicorn. This Python backend performs Computer Vision tasks utilizing the **Ultralytics YOLOv8** model to analyze cooler contents. Data persistence and modeling are handled by **Prisma ORM**, interfacing with a robust relational database.

**Project Structure**
```text
├── prisma/             # Database schema and seed data
├── public/             # Static assets and uploads
├── scripts/            # Python backend scripts
│   └── analyze_cooler.py # YOLOv8 FastAPI backend
├── src/
│   ├── app/            # Next.js App Router (Pages & API routes)
│   │   ├── api/        # REST endpoints (BMS, WMS, Ingest, etc.)
│   │   └── page.tsx    # Main Application Entry
│   ├── components/
│   │   ├── coldops/    # Core business logic UI components
│   │   └── ui/         # Reusable shadcn/ui components
│   ├── hooks/          # React hooks (realtime, toasts, etc.)
│   └── lib/            # Utilities and Services
│       ├── bms/        # Building Management System adapters
│       ├── coldops/    # Core algorithmic engines (Ghost load detection)
│       └── realtime/   # Socket.io client setup
└── start.ps1           # Main startup script for Windows
```

**Challenge and Approach**  
Industrial coolers consume massive amounts of energy, often accounting for up to 60% of a facility's total electricity costs. The challenge is "ghost loads"—cooling empty space or miscalculated inventory, leading to unnecessary energy waste. Our approach intelligently bridges the gap between Warehouse Management Systems (WMS) and Building Management Systems (BMS). By utilizing real-time computer vision (YOLOv8) to verify physical inventory against the WMS, ColdOps dynamically adjusts cooler settings via the BMS. This precise, data-driven setback mechanism ensures coolers only use the energy required for the actual load, significantly reducing overall electricity usage and operational costs without compromising product safety.

**Ways to startup this application**

**Live Deployment:**  
[Vercel Deployment Link](https://coldop.vercel.app/) *(Note: Requires configuring the Python backend URL in Vercel environment variables).*

**Preparation to run locally:**
1. Ensure you have **Node.js** (v18+) and **Python** (3.8+) installed.
2. Ensure you have a standard database setup locally (e.g., SQLite or PostgreSQL).

To start the application, simply run our wrapper script which will install packages and start both servers:
```bash
./start.ps1
```

Alternatively, for existing users that have all the dependencies installed, you can just run the Next.js frontend manually, use:
```bash
npm run dev
```
