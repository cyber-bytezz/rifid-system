import subprocess
import os
import sqlite3
from time import sleep

DB_PATH = "database/students.db"

# ---------- 1. Check if DB exists ----------
if not os.path.exists(DB_PATH):
    print("📦 Database not found. Creating new database...")
    subprocess.run(["python3", "scripts/create_db.py"])

# ---------- 2. Ask if admin wants to register a new student ----------
try:
    choice = input("➕ Do you want to register a new student? (y/n): ").strip().lower()
    if choice == 'y':
        subprocess.run(["python3", "scripts/register_student.py"])
except Exception as e:
    print(f"⚠️ Error during registration: {e}")

# ---------- 3. Start FastAPI server in background ----------
print("🚀 Launching FastAPI backend at http://0.0.0.0:8000 ...")
uvicorn_process = subprocess.Popen(
    ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
)

sleep(2)

# ---------- 4. Start attendance logging ----------
try:
    print("\n🟢 Starting attendance scanner...\n")
    subprocess.run(["python3", "scripts/attendance_logger.py"])
except KeyboardInterrupt:
    print("\n🛑 Attendance scanner stopped.")
finally:
    print("🧹 Cleaning up...")
    uvicorn_process.terminate()
