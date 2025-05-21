import sqlite3
from mfrc522 import SimpleMFRC522
import RPi.GPIO as GPIO
import os

# Get absolute DB path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "database", "students.db")

reader = SimpleMFRC522()

def delete_student_by_uid(uid):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("""
        SELECT name, reg_no, department, year, section
        FROM students
        WHERE uid = ?
    """, (uid,))
    result = cursor.fetchone()

    if result:
        name, reg_no, department, year, section = result
        print("\n🧾 Student Details:")
        print(f"👤 Name      : {name}")
        print(f"🎓 Reg No    : {reg_no}")
        print(f"🏛️ Department: {department}")
        print(f"📘 Year      : {year}")
        print(f"🏫 Section   : {section}")
        confirm = input("\n⚠️ Are you sure you want to delete this student? (y/n): ").strip().lower()
        if confirm == 'y':
            cursor.execute("DELETE FROM students WHERE uid = ?", (uid,))
            conn.commit()
            print(f"\n✅ {name} has been deleted from the system.")
        else:
            print("❎ Deletion cancelled.")
    else:
        print("❌ No student found with this UID.")

    conn.close()

# Start the process
try:
    print("\n📍 Scan the card of the student you want to delete...")
    uid, _ = reader.read()
    uid = str(uid)
    delete_student_by_uid(uid)

except Exception as e:
    print(f"❌ Error: {e}")
finally:
    GPIO.cleanup()
