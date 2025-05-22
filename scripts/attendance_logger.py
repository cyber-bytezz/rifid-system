import sqlite3
from mfrc522 import SimpleMFRC522
import RPi.GPIO as GPIO
from datetime import datetime
import os
import time
from scanner_event_queue import set_latest_uid

# Setup paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "database", "students.db")

# RFID Reader
reader = SimpleMFRC522()

# Buzzer on GPIO 18
BUZZER_PIN = 18
GPIO.setwarnings(False)
GPIO.cleanup()  # ✅ Ensures GPIO is not blocked
GPIO.setmode(GPIO.BCM)
GPIO.setup(BUZZER_PIN, GPIO.OUT)

def beep(duration=0.3):
    print(f"[BEEP] for {duration}s")
    GPIO.output(BUZZER_PIN, GPIO.HIGH)
    time.sleep(duration)
    GPIO.output(BUZZER_PIN, GPIO.LOW)

print("\n📲 Attendance Logger Started. Press Ctrl+C to stop.\n")

try:
    while True:
        print("📡 Waiting for RFID scan...")
        uid, _ = reader.read()
        beep(0.15)  # ✅ Instant feedback
        uid = str(uid)

        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        cursor.execute("SELECT name FROM students WHERE uid = ?", (uid,))
        result = cursor.fetchone()

        if result:
            name = result[0]
            now = datetime.now()
            date = now.strftime("%Y-%m-%d")
            time_now = now.strftime("%H:%M:%S")

            cursor.execute("SELECT * FROM attendance WHERE uid = ? AND date = ?", (uid, date))
            if cursor.fetchone():
                print(f"🟡 {name} already marked present today.")
                beep(0.2)
            else:
                cursor.execute('''
                    INSERT INTO attendance (uid, name, date, time, status)
                    VALUES (?, ?, ?, ?, ?)
                ''', (uid, name, date, time_now, "Present"))
                conn.commit()
                print(f"✅ {name} marked present at {time_now} on {date}")
                beep(0.5)
        else:
            print("❌ Unregistered card detected. Sending to frontend...")
            set_latest_uid(uid)
            beep(0.3)

        conn.close()
        print("-----\n")
        time.sleep(1.5)

except KeyboardInterrupt:
    print("\n🛑 Attendance logging stopped.")
finally:
    GPIO.output(BUZZER_PIN, GPIO.LOW)
    GPIO.cleanup()
