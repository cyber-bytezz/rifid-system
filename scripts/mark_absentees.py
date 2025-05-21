import sqlite3
from datetime import datetime, time
import os

# Get full DB path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "database", "students.db")

def is_past_830am():
    now = datetime.now().time()
    return now >= time(8, 30)

def mark_absentees():
    if not is_past_830am():
        print("⏳ It's not yet 8:30 AM. Come back later!")
        return

    today = datetime.now().strftime("%Y-%m-%d")

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Get all registered students
    cursor.execute("SELECT uid, name FROM students")
    all_students = cursor.fetchall()

    marked = 0
    skipped = 0

    for uid, name in all_students:
        # Check if already marked present today
        cursor.execute("SELECT * FROM attendance WHERE uid = ? AND date = ?", (uid, today))
        if cursor.fetchone():
            skipped += 1
            continue

        # Mark absent
        cursor.execute('''
            INSERT INTO attendance (uid, name, date, time, status)
            VALUES (?, ?, ?, ?, ?)
        ''', (uid, name, today, "08:30:00", "Absent"))
        marked += 1

    conn.commit()
    conn.close()

    print(f"\n✅ Marked {marked} student(s) as Absent.")
    print(f"🟢 Skipped {skipped} already present.")

# Run it
if __name__ == "__main__":
    mark_absentees()
