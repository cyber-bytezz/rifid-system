# RFID Attendance System - Frontend Dashboard

This is a modern web dashboard for the Raspberry Pi-based RFID Student Attendance System. The dashboard connects to the FastAPI backend to display attendance records and student information.

## Features

- **Live Attendance Monitoring**: View real-time attendance with auto-refresh every 10 seconds
- **Student Registry**: Complete listing of all registered students with search and filter options
- **Attendance Logs**: Historical attendance data with advanced filtering capabilities
- **Data Visualization**: Interactive charts showing department distribution and attendance trends
- **Data Export**: Export attendance records in CSV format
- **Responsive Design**: Works on desktop and mobile devices

## Pages

1. **Dashboard** - Overview with statistics, charts, and today's attendance
2. **Students** - Complete student registry with filtering options
3. **Attendance Logs** - Full attendance history with advanced filtering
4. **Export** - Options to export attendance data

## Technical Implementation

- **HTML5** for structure
- **CSS3** with Flexbox/Grid for responsive layout
- **Pure JavaScript** (ES6+) for functionality
- **Chart.js** for data visualization
- **Fetch API** for data retrieval from backend

## Backend Integration

The dashboard connects to the FastAPI backend at `http://192.168.22.201:8000` with these endpoints:

- `GET /students` - List of all registered students
- `GET /attendance` - All attendance records
- `GET /attendance/today` - Today's attendance only

## Usage

1. Ensure the FastAPI backend is running on the Raspberry Pi
2. Open `index.html` in a web browser
3. The dashboard will automatically connect to the backend and start displaying data

No additional setup or dependencies required for the frontend.

## Notes

- The export functionality displays a message instructing the user to run the export script on the Raspberry Pi
- For any data not available from the API, placeholders are displayed with "N/A"
