import sqlite3
from mfrc522 import SimpleMFRC522
import RPi.GPIO as GPIO
import os
import time

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "database", "students.db")

# RFID Reader
reader = SimpleMFRC522()

# Buzzer setup on GPIO 18 (Pin 12)
BUZZER_PIN = 18
if GPIO.getmode() is None:
    GPIO.setmode(GPIO.BCM)
GPIO.setwarnings(False)
GPIO.setup(BUZZER_PIN, GPIO.OUT)

def beep(duration=0.4):
    GPIO.output(BUZZER_PIN, GPIO.HIGH)
    time.sleep(duration)
    GPIO.output(BUZZER_PIN, GPIO.LOW)

# Register process
try:
    print("\n📢 Scan the student's RFID card...")
    uid, _ = reader.read()
    uid = str(uid)
    print(f"🔗 UID detected: {uid}\n")

    name = input("👤 Enter student name: ")
    reg_no = input("🎓 Enter register number: ")
    department = input("🏛️ Enter department: ")
    year = input("📘 Enter year (e.g., 2nd): ")
    section = input("🏫 Enter section (e.g., CSE-A): ")

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM students WHERE uid = ?", (uid,))
    if cursor.fetchone():
        print("⚠️ This UID is already registered.")
    else:
        cursor.execute('''
            INSERT INTO students (uid, name, reg_no, department, year, section)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (uid, name, reg_no, department, year, section))
        conn.commit()
        print(f"\n✅ {name} has been registered successfully!")
        beep(0.5)

except Exception as e:
    print(f"❌ Error: {e}")
finally:
    GPIO.output(BUZZER_PIN, GPIO.LOW)
    GPIO.cleanup()
    if 'conn' in locals():
        conn.close()


