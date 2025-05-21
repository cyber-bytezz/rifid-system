from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sqlite3
import os
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "database", "students.db")

app = FastAPI()

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

@app.get("/students/{uid}")
def get_student_by_uid(uid: str):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT uid, name, reg_no, department, year, section FROM students WHERE uid = ?", (uid,))
    row = cursor.fetchone()
    conn.close()
    if row:
        uid, name, reg_no, department, year, section = row
        return {
            "uid": uid,
            "name": name,
            "reg_no": reg_no,
            "department": department,
            "year": year,
            "section": section
        }
    else:
        raise HTTPException(status_code=404, detail="Student not found")

class Student(BaseModel):
    uid: str
    name: str
    reg_no: str
    department: str
    year: str
    section: str

@app.post("/students")
def register_student(student: Student):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT uid FROM students WHERE uid = ?", (student.uid,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="UID already registered")
    try:
        cursor.execute('''
            INSERT INTO students (uid, name, reg_no, department, year, section)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (student.uid, student.name, student.reg_no, student.department, student.year, student.section))
        conn.commit()
        return {"success": True, "message": "Student registered successfully!"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")
    finally:
        conn.close()

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

@app.delete("/students/{uid}")
def delete_student(uid: str):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM students WHERE uid = ?", (uid,))
    student = cursor.fetchone()
    if not student:
        conn.close()
        raise HTTPException(status_code=404, detail="Student not found")
    try:
        cursor.execute("DELETE FROM students WHERE uid = ?", (uid,))
        cursor.execute("DELETE FROM attendance WHERE uid = ?", (uid,))
        conn.commit()
        return {
            "success": True,
            "message": f"Deleted {student[0]} (UID: {uid})"
        }
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete: {str(e)}")
    finally:
        conn.close()
