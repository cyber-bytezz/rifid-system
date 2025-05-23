# RFID Attendance System - Complete Installation Guide for Linux

This document provides comprehensive instructions for setting up the RFID Attendance System on Linux, covering both the backend (Raspberry Pi) and frontend (dashboard) components.

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Backend Installation](#backend-installation)
   - [Hardware Setup](#hardware-setup)
   - [Software Dependencies](#software-dependencies)
   - [Database Configuration](#database-configuration)
3. [Frontend Installation](#frontend-installation)
4. [Running the System](#running-the-system)
5. [Troubleshooting](#troubleshooting)

## System Requirements

### Hardware
- Raspberry Pi (Model 3B+ or newer recommended)
- MFRC522 RFID Reader module
- RFID Tags/Cards (13.56MHz)
- Jumper wires
- MicroSD card (8GB minimum, 16GB+ recommended)
- Power supply for Raspberry Pi (5V/2.5A recommended)
- Network connection (Ethernet or WiFi)
- Buzzer (optional, for audio feedback)

### Software
- Raspberry Pi OS (64-bit) - Fresh installation recommended
- Python 3.8 or newer (comes pre-installed on Raspberry Pi OS)
- pip (Python package manager)
- Modern web browser (Chrome, Firefox, or Edge)
- Git (for cloning the repository)

### Important Notes Before Installation

1. **API Endpoint Configuration**:
   - The frontend is hardcoded to connect to `http://192.168.21.202:8000`
   - Update this in `js/app.js` if your backend will run on a different IP/port

2. **File Permissions**:
   - The application needs write access to the `database` directory
   - Ensure the web server user has proper permissions to access all files

3. **Hardware Dependencies**:
   - The system requires SPI interface to be enabled
   - The buzzer is connected to GPIO 18 by default (configurable in `attendance_logger.py`)

## Backend Installation

### Initial Setup

1. **Update your system:**
   ```bash
   sudo apt update
   sudo apt upgrade -y
   sudo apt install -y git python3-pip python3-venv sqlite3
   ```

2. **Enable SPI Interface:**
   ```bash
   sudo raspi-config
   ```
   - Navigate to "Interface Options" > "SPI" > "Yes" to enable SPI
   - Reboot when prompted

3. **Install hardware dependencies:**
   ```bash
   sudo apt install -y python3-rpi.gpio python3-spidev
   ```

### Hardware Setup

**MFRC522 RFID Reader Connections:**

| MFRC522 Pin | Raspberry Pi GPIO | Physical Pin |
|-------------|-------------------|--------------|
| SDA         | GPIO 8 (CE0)      | Pin 24       |
| SCK         | GPIO 11 (SCLK)    | Pin 23       |
| MOSI        | GPIO 10 (MOSI)    | Pin 19       |
| MISO        | GPIO 9 (MISO)     | Pin 21       |
| IRQ         | Not Connected     | -            |
| GND         | Ground            | Pin 6        |
| RST         | GPIO 25           | Pin 22       |
| 3.3V        | 3.3V Power        | Pin 1        |

**Buzzer (Optional):**
- Connect positive (+) to GPIO 18 (Pin 12)
- Connect negative (-) to Ground (Pin 14)

### Software Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/rifid-system.git
   cd rifid-system
   ```

2. **Create and activate virtual environment:**
   ```bash
   python3 -m venv env
   source env/bin/activate
   ```

3. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Fix potential permission issues:**
   ```bash
   sudo usermod -a -G spi,gpio $USER
   sudo chmod a+rw /dev/spidev0.*
   ```
   > Note: You'll need to log out and log back in for the group changes to take effect.

### Software Dependencies

1. **Update system packages:**
   ```bash
   sudo apt update
   sudo apt upgrade -y
   ```

2. **Install required system packages:**
   ```bash
   sudo apt install -y python3-pip python3-venv git sqlite3
   ```

3. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/rifid-system.git
   cd rifid-system
   ```

4. **Create and activate a virtual environment:**
   ```bash
   python3 -m venv env
   source env/bin/activate
   ```

5. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

   > Note: If you encounter errors with RPi.GPIO or spidev, install them separately:
   > ```bash
   > sudo apt install -y python3-rpi.gpio python3-spidev
   > pip install RPi.GPIO spidev
   > ```

### Database Configuration

1. **Create the initial database:**
   ```bash
   python3 scripts/create_db.py
   ```

2. **Register students (optional at this stage):**
   ```bash
   python3 scripts/register_student.py
   ```

## Frontend Setup

The frontend is a static web application that connects to the backend API. Here's how to set it up:

### 1. Configuration Check

Before starting, ensure the frontend is configured to connect to the correct backend:

1. Open `js/app.js` in a text editor
2. Locate the `API_BASE_URL` constant at the top of the file
3. Update it to match your backend IP address and port (default is port 8000)
   ```javascript
   const API_BASE_URL = 'http://YOUR_PI_IP:8000';
   ```

### 2. Accessing the Dashboard

#### Option 1: Direct File Access (Recommended for Testing)
```bash
# Navigate to the project directory
cd rifid-system

# Open in default web browser
xdg-open index.html
```

#### Option 2: Python HTTP Server (Better for Production)
```bash
# From the project root directory
python3 -m http.server 8001
```
Then open `http://localhost:8001` in your browser.

#### Option 3: Network Access
If accessing from another device on the same network:
1. Make sure the device can reach your Raspberry Pi's IP
2. Open `http://YOUR_PI_IP:8001` (or whatever port you used)

### 3. Troubleshooting Frontend Issues

- **CORS Errors**: If you see CORS errors in the browser console, ensure the backend is running and accessible
- **Connection Refused**: Verify the backend server is running and the IP/port match the `API_BASE_URL`
- **Blank Page**: Check the browser console for JavaScript errors

### 4. Important Security Note

For production use, consider:
1. Setting up HTTPS
2. Adding authentication
3. Using a proper web server (like Nginx) to serve the frontend
4. Restricting access to the backend API (currently allows CORS from any origin)

## Running the System

### Starting the System

1. **Start the complete system:**
   ```bash
   cd rifid-system
   source env/bin/activate
   python3 run.py
   ```
   
   This will:
   - Check if the database exists (create if missing)
   - Prompt to register new students
   - Start the FastAPI backend server
   - Start the attendance logger for RFID scanning

2. **Create a systemd service for auto-start (optional):**
   ```bash
   sudo nano /etc/systemd/system/rfid-attendance.service
   ```

   Add the following content:
   ```
   [Unit]
   Description=RFID Attendance System
   After=network.target

   [Service]
   User=pi
   WorkingDirectory=/home/pi/rifid-system
   ExecStart=/home/pi/rifid-system/env/bin/python3 /home/pi/rifid-system/run.py
   Restart=on-failure

   [Install]
   WantedBy=multi-user.target
   ```

   Enable and start the service:
   ```bash
   sudo systemctl enable rfid-attendance
   sudo systemctl start rfid-attendance
   ```

### Managing Students

1. **Register new students:**
   ```bash
   python3 scripts/register_student.py
   ```

2. **Export attendance data:**
   ```bash
   python3 scripts/export_attendance.py
   ```

## Troubleshooting

### Common Issues and Solutions

1. **RFID Reader Not Detected:**
   - Verify SPI is enabled: `lsmod | grep spi`
   - Check wiring connections
   - Run diagnostic: `python3 scripts/test_rfid_reader.py`

2. **Database Errors:**
   - Verify permissions: `sudo chown -R pi:pi database/`
   - Check database integrity: `sqlite3 database/students.db "PRAGMA integrity_check;"`

3. **API Server Issues:**
   - Check if server is running: `ps aux | grep uvicorn`
   - Verify port availability: `sudo netstat -tulpn | grep 8000`
   - Test API directly: `curl http://localhost:8000/students`

4. **Frontend Connection Problems:**
   - Confirm backend URL is correct in frontend code
   - Check for CORS issues in browser console
   - Verify network connectivity between devices

### Logs and Debugging

1. **View application logs:**
   ```bash
   tail -f logs/app.log
   ```

2. **Check systemd service logs (if using systemd):**
   ```bash
   sudo journalctl -u rfid-attendance.service -f
   ```

3. **Enable debug mode:**
   - Edit `run.py` to enable debug flags
   - Restart the application

## Maintenance

1. **Backup the database regularly:**
   ```bash
   cp database/students.db database/students.db.backup
   ```

2. **Update the system:**
   ```bash
   cd rifid-system
   git pull
   source env/bin/activate
   pip install -r requirements.txt
   ```

3. **Monitor disk space:**
   ```bash
   df -h
   ```

---

For additional assistance, please refer to the project's GitHub repository or contact support.
