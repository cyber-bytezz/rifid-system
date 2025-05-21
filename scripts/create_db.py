import sqlite3
import os

# Ensure the database directory exists
os.makedirs("../database", exist_ok=True)

# Connect to (or create) the database
conn = sqlite3.connect("../database/students.db")
cursor = conn.cursor()

# Create the students table
cursor.execute('''
CREATE TABLE IF NOT EXISTS students (
    uid TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    reg_no TEXT NOT NULL,
    department TEXT NOT NULL,
    year TEXT NOT NULL,
    section TEXT NOT NULL,
    image TEXT DEFAULT 'default.jpg'
)
''')

# Create the attendance table
cursor.execute('''
CREATE TABLE IF NOT EXISTS attendance (
    uid TEXT NOT NULL,
    name TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    status TEXT NOT NULL
)
''')

conn.commit()
conn.close()

print("✅ Database and tables created successfully.")
