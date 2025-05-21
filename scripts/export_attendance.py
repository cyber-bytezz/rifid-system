import sqlite3
import csv
from datetime import datetime

DB_PATH = "../database/students.db"
EXPORT_FILE = f"attendance_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"

def fetch_attendance(date=None, section=None, reg_no=None):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    query = """
        SELECT s.name, s.reg_no, s.section, s.department, s.year,
               a.date, a.time, a.status
        FROM students s
        JOIN attendance a ON s.uid = a.uid
        WHERE 1=1
    """
    params = []

    if date:
        query += " AND a.date = ?"
        params.append(date)
    if section:
        query += " AND s.section = ?"
        params.append(section)
    if reg_no:
        query += " AND s.reg_no = ?"
        params.append(reg_no)

    query += " ORDER BY a.date DESC, a.time DESC"
    cursor.execute(query, tuple(params))
    rows = cursor.fetchall()
    conn.close()
    return rows

# Prompt filters
print("\n📤 Export Attendance to CSV")
date = input("📅 Enter date (YYYY-MM-DD) or leave blank: ").strip() or None
section = input("🏫 Enter section (e.g., A) or leave blank: ").strip() or None
reg_no = input("🎓 Enter register number or leave blank: ").strip() or None

# Fetch records
records = fetch_attendance(date, section, reg_no)

# Export to CSV
if records:
    with open(EXPORT_FILE, mode="w", newline="") as file:
        writer = csv.writer(file)
        writer.writerow(["Name", "Reg No", "Section", "Dept", "Year", "Date", "Time", "Status"])
        writer.writerows(records)

    print(f"\n✅ Attendance exported to file: {EXPORT_FILE}")
else:
    print("\n⚠️ No records to export.")
