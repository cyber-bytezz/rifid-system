from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import sqlite3
import os

# Dynamic path to the database
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "database", "students.db")

app = FastAPI()

# Allow cross-origin for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"message": "RFID Attendance API is running."}

@app.get("/students")
def get_students():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT uid, name, reg_no, department, year, section, image FROM students")
    rows = cursor.fetchall()
    conn.close()
    return [
        {
            "uid": uid,
            "name": name,
            "reg_no": reg_no,
            "department": department,
            "year": year,
            "section": section,
            "image": image
        }
        for (uid, name, reg_no, department, year, section, image) in rows
    ]

@app.get("/attendance")
def get_attendance():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT uid, name, date, time, status FROM attendance ORDER BY date DESC, time DESC")
    rows = cursor.fetchall()
    conn.close()
    return [
        {
            "uid": uid,
            "name": name,
            "date": date,
            "time": time,
            "status": status
        }
        for (uid, name, date, time, status) in rows
    ]

@app.get("/attendance/today")
def get_attendance_today():
    from datetime import datetime
    today = datetime.now().strftime("%Y-%m-%d")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT uid, name, date, time, status FROM attendance WHERE date = ?", (today,))
    rows = cursor.fetchall()
    conn.close()
    return [
        {
            "uid": uid,
            "name": name,
            "date": date,
            "time": time,
            "status": status
        }
        for (uid, name, date, time, status) in rows
    ]
