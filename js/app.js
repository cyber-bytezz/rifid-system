/**
 * RFID Attendance System - Frontend Dashboard
 * 
 * This script powers the frontend dashboard for the RFID-based attendance system.
 * It connects to a FastAPI backend to fetch student and attendance data.
 * 
 * Features:
 * - Live attendance view with auto-refresh
 * - Student registry with filtering
 * - Full attendance logs with pagination and filtering
 * - Data export functionality
 * - Chart visualizations
 */

// ======= Global Configuration =======
const API_BASE_URL = 'http://192.168.21.202:8000';
const REFRESH_INTERVAL = 5000; // 10 seconds

// ======= Global State =======
let studentsData = [];
let attendanceData = [];
let todayAttendanceData = [];
let refreshTimer;
let countdownInterval;
let currentPage = 1;
const pageSize = 25;
let departmentChart = null;
let attendanceTrendChart = null;

// ======= DOM Elements =======
document.addEventListener('DOMContentLoaded', () => {
    // Set up navigation
    setupNavigation();
    
    // Initialize date and time display
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    // Load initial data
    loadDashboardData();
    
    // Set up filter event listeners
    setupFilterListeners();
    
    // Set up export buttons
    setupExportButtons();
    
    // Set up modal controls
    setupModalControls();
    
    // Set up registration form
    setupRegistrationForm();
    
    // Start auto-refresh for today's attendance
    startAutoRefresh();
});

/**
 * Sets up the main navigation between pages
 */
function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-links li');
    const pages = document.querySelectorAll('.page');
    
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            const targetPage = link.getAttribute('data-page');
            
            // Reset active states
            navLinks.forEach(l => l.classList.remove('active'));
            pages.forEach(p => p.classList.remove('active'));
            
            // Set active states
            link.classList.add('active');
            document.getElementById(targetPage).classList.add('active');
            
            // Load page-specific data if needed
            if (targetPage === 'dashboard') {
                loadDashboardData();
                startAutoRefresh();
            } else {
                stopAutoRefresh();
                
                if (targetPage === 'students') {
                    loadStudentsData();
                } else if (targetPage === 'attendance') {
                    loadAttendanceData();
                }
            }
        });
    });
}

/**
 * Updates the date and time display in the header
 */
function updateDateTime() {
    const now = new Date();
    
    // Format date: May 21, 2025
    const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = now.toLocaleDateString('en-US', dateOptions);
    
    // Format time: 09:45:30 AM
    const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
    const formattedTime = now.toLocaleTimeString('en-US', timeOptions);
    
    document.getElementById('current-date').textContent = formattedDate;
    document.getElementById('current-time').textContent = formattedTime;
}

/**
 * Loads all data needed for the dashboard
 */
function loadDashboardData() {
    // Load students data
    fetch(`${API_BASE_URL}/students`)
        .then(response => response.json())
        .then(data => {
            studentsData = data;
            updateStudentStats();
            updateDepartmentChart();
        })
        .catch(error => {
            showNotification('Error loading students data');
            console.error('Error fetching students:', error);
        });
    
    // Load today's attendance
    loadTodayAttendance();
    
    // Load all attendance for trends
    fetch(`${API_BASE_URL}/attendance`)
        .then(response => response.json())
        .then(data => {
            attendanceData = data;
            updateAttendanceTrendChart();
        })
        .catch(error => {
            console.error('Error fetching attendance:', error);
        });
}

/**
 * Loads today's attendance data
 */
function loadTodayAttendance() {
    fetch(`${API_BASE_URL}/attendance/today`)
        .then(response => response.json())
        .then(data => {
            todayAttendanceData = data;
            updateTodayAttendanceTable();
            updateAttendanceStats();
        })
        .catch(error => {
            showNotification('Error loading today\'s attendance');
            console.error('Error fetching today\'s attendance:', error);
        });
}

/**
 * Updates the student statistics cards
 */
function updateStudentStats() {
    document.getElementById('total-students').textContent = studentsData.length;
    
    // Update attendance rate calculation
    updateAttendanceStats();
}

/**
 * Updates the attendance statistics based on today's data
 */
function updateAttendanceStats() {
    const presentToday = todayAttendanceData.length;
    document.getElementById('present-today').textContent = presentToday;
    
    const totalStudents = studentsData.length;
    const attendanceRate = totalStudents > 0 ? Math.round((presentToday / totalStudents) * 100) : 0;
    document.getElementById('attendance-rate').textContent = `${attendanceRate}%`;
    
    // Update last scan time
    if (todayAttendanceData.length > 0) {
        // Sort by time, descending
        const sortedEntries = [...todayAttendanceData].sort((a, b) => {
            return new Date(`${a.date} ${a.time}`) < new Date(`${b.date} ${b.time}`) ? 1 : -1;
        });
        
        const lastScan = sortedEntries[0];
        document.getElementById('last-scan').textContent = lastScan.time;
    } else {
        document.getElementById('last-scan').textContent = 'No scans today';
    }
}

/**
 * Updates the today's attendance table with the latest data
 */
function updateTodayAttendanceTable() {
    const tableBody = document.getElementById('today-attendance-body');
    tableBody.innerHTML = '';
    
    if (todayAttendanceData.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `<td colspan="7" style="text-align: center;">No attendance records for today</td>`;
        tableBody.appendChild(emptyRow);
        return;
    }
    
    // Merge with student data to get additional fields
    todayAttendanceData.forEach(record => {
        const student = studentsData.find(s => s.uid === record.uid) || {};
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${record.name}</td>
            <td>${student.reg_no || 'N/A'}</td>
            <td>${student.section || 'N/A'}</td>
            <td>${student.year || 'N/A'}</td>
            <td>${student.department || 'N/A'}</td>
            <td>${record.time}</td>
            <td class="status-${record.status.toLowerCase()}">${record.status}</td>
        `;
        tableBody.appendChild(row);
    });
}

/**
 * Creates or updates the year-wise student distribution chart
 */
function updateDepartmentChart() {
    if (!studentsData.length) return;
    
    // Get all student counts by year
    const yearCounts = {
        '1': 0,
        '2': 0,
        '3': 0,
        '4': 0
    };
    
    // Count students in each year
    studentsData.forEach(student => {
        if (student.year && yearCounts.hasOwnProperty(student.year)) {
            yearCounts[student.year]++;
        }
    });
    
    const yearLabels = {
        '1': '1st Year',
        '2': '2nd Year',
        '3': '3rd Year',
        '4': '4th Year'
    };
    
    const labels = Object.keys(yearCounts).map(year => yearLabels[year]);
    const data = Object.values(yearCounts);
    
    // Create a professional color scheme for the years
    const colorScheme = [
        'rgba(67, 97, 238, 0.8)',    // Primary blue
        'rgba(56, 182, 255, 0.8)',   // Accent blue
        'rgba(0, 200, 150, 0.8)',    // Success green
        'rgba(255, 209, 102, 0.8)'   // Warning yellow
    ];
    
    // Generate hover colors (slightly brighter)
    const hoverColors = [
        'rgba(100, 130, 248, 0.85)',
        'rgba(86, 202, 255, 0.85)',
        'rgba(20, 220, 170, 0.85)',
        'rgba(255, 219, 132, 0.85)'
    ];
    
    // Update title of the chart section
    const chartTitle = document.querySelector('.chart-card h3');
    if (chartTitle && chartTitle.textContent.includes('Department')) {
        chartTitle.innerHTML = '<i class="fas fa-user-graduate"></i> Student Distribution by Year';
    }
    
    const ctx = document.getElementById('department-chart').getContext('2d');
    
    if (departmentChart) {
        departmentChart.destroy();
    }
    
    departmentChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colorScheme,
                hoverBackgroundColor: hoverColors,
                borderColor: 'white',
                borderWidth: 2,
                borderRadius: 4,
                hoverBorderWidth: 0,
                hoverOffset: 10,
                spacing: 2,
                weight: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        font: {
                            family: 'Segoe UI',
                            size: 13,
                            weight: 500
                        },
                        padding: 15,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(20, 30, 50, 0.85)',
                    titleFont: {
                        family: 'Segoe UI',
                        size: 14,
                        weight: 'bold'
                    },
                    bodyFont: {
                        family: 'Segoe UI',
                        size: 13
                    },
                    padding: 12,
                    cornerRadius: 8,
                    caretSize: 8,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                            return ` ${label}: ${value} students (${percentage}%)`;
                        }
                    }
                }
            },
            animation: {
                animateScale: true,
                animateRotate: true,
                duration: 1000,
                easing: 'easeOutCubic'
            }
        }
    });

    // Add center text if not already present
    const chartContainer = document.getElementById('department-chart').parentNode;
    if (!document.getElementById('chart-center-text')) {
        const totalStudents = data.reduce((a, b) => a + b, 0);
        
        const centerTextDiv = document.createElement('div');
        centerTextDiv.id = 'chart-center-text';
        centerTextDiv.innerHTML = `
            <div class="total-number">${totalStudents}</div>
            <div class="total-label">Total Students</div>
        `;
        chartContainer.appendChild(centerTextDiv);
        
        // Add CSS for center text positioning
        const style = document.createElement('style');
        style.textContent = `
            .chart-container {
                position: relative;
            }
            #chart-center-text {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                text-align: center;
                pointer-events: none;
            }
            #chart-center-text .total-number {
                font-size: 24px;
                font-weight: 700;
                color: var(--dark-color);
            }
            #chart-center-text .total-label {
                font-size: 13px;
                color: var(--gray-color);
                font-weight: 500;
            }
        `;
        document.head.appendChild(style);
    } else {
        // Update existing center text
        const totalStudents = data.reduce((a, b) => a + b, 0);
        document.querySelector('#chart-center-text .total-number').textContent = totalStudents;
    }
}

/**
 * Creates or updates the attendance trend chart
 */
function updateAttendanceTrendChart() {
    if (!attendanceData.length) return;
    
    // Get last 7 days of data
    const dates = {};
    const today = new Date();
    
    // Initialize last 7 days with 0 counts
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        dates[dateStr] = 0;
    }
    
    // Count attendances for each day
    attendanceData.forEach(record => {
        if (dates.hasOwnProperty(record.date)) {
            dates[record.date]++;
        }
    });
    
    const labels = Object.keys(dates);
    const data = Object.values(dates);
    
    const ctx = document.getElementById('attendance-trend-chart').getContext('2d');
    
    if (attendanceTrendChart) {
        attendanceTrendChart.destroy();
    }
    
    attendanceTrendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels.map(formatDateLabel),
            datasets: [{
                label: 'Attendance Count',
                data: data,
                backgroundColor: 'rgba(67, 97, 238, 0.2)',
                borderColor: '#4361ee',
                borderWidth: 2,
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
}

/**
 * Formats date label for chart display (e.g., "May 21")
 */
function formatDateLabel(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Loads the student registry data
 */
function loadStudentsData() {
    if (studentsData.length) {
        renderStudentsTable(studentsData);
    } else {
        fetch(`${API_BASE_URL}/students`)
            .then(response => response.json())
            .then(data => {
                studentsData = data;
                renderStudentsTable(data);
            })
            .catch(error => {
                showNotification('Error loading students data');
                console.error('Error fetching students:', error);
            });
    }
}

/**
 * Renders the students table with filter functionality
 */
function renderStudentsTable(data) {
    const tableBody = document.getElementById('students-table-body');
    tableBody.innerHTML = '';
    
    // Apply filters
    const yearFilter = document.getElementById('year-filter').value;
    const sectionFilter = document.getElementById('section-filter').value;
    const searchTerm = document.getElementById('student-search').value.toLowerCase();
    
    const filteredData = data.filter(student => {
        return (!yearFilter || student.year === yearFilter) && 
               (!sectionFilter || (student.section && student.section.includes(sectionFilter))) &&
               (!searchTerm || 
                student.name.toLowerCase().includes(searchTerm) || 
                (student.reg_no && student.reg_no.toLowerCase().includes(searchTerm)));
    });
    
    // Add table style for avatar column if not already added
    if (!document.getElementById('student-avatar-styles')) {
        const style = document.createElement('style');
        style.id = 'student-avatar-styles';
        style.textContent = `
            .student-avatar {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                margin-right: 10px;
                vertical-align: middle;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                background-color: #4361ee;
                color: white;
                font-weight: bold;
                font-size: 18px;
            }
            .student-name-cell {
                display: flex;
                align-items: center;
            }
            .name-text {
                display: inline-block;
                vertical-align: middle;
            }
        `;
        document.head.appendChild(style);
    }
    
    if (filteredData.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `<td colspan="7" style="text-align: center;">No students found</td>`;
        tableBody.appendChild(emptyRow);
        return;
    }
    
    filteredData.forEach(student => {
        // Create avatar with first letter of student's name
        const firstLetter = student.name ? student.name.charAt(0).toUpperCase() : '?';
        
        // Set a consistent background color based on the name
        let avatarBg = '#4361ee';
        if (student.name) {
            const colorIndex = student.name.charCodeAt(0) % 5;
            const colors = ['#4361ee', '#3a0ca3', '#f72585', '#7209b7', '#4cc9f0'];
            avatarBg = colors[colorIndex];
        }
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${student.uid}</td>
            <td>
                <div class="student-name-cell">
                    <div class="student-avatar" style="background-color: ${avatarBg};">${firstLetter}</div>
                    <span class="name-text">${student.name}</span>
                </div>
            </td>
            <td>${student.reg_no || 'N/A'}</td>
            <td>${student.department || 'N/A'}</td>
            <td>${student.year || 'N/A'}</td>
            <td>${student.section || 'N/A'}</td>
            <td>
                <button class="view-btn" data-uid="${student.uid}">
                    <i class="fas fa-eye"></i> View
                </button>
                <button class="delete-btn" data-uid="${student.uid}" data-name="${student.name}">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
    
    // Add event listeners to buttons
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', function() {
            const uid = this.getAttribute('data-uid');
            const name = this.getAttribute('data-name');
            confirmDeleteStudent(uid, name);
        });
    });
    
    document.querySelectorAll('.view-btn').forEach(button => {
        button.addEventListener('click', function() {
            const uid = this.getAttribute('data-uid');
            viewStudentDetails(uid);
        });
    });
}

/**
 * Loads the attendance logs data
 */
function loadAttendanceData() {
    fetch(`${API_BASE_URL}/attendance`)
        .then(response => response.json())
        .then(data => {
            attendanceData = data;
            renderAttendanceLogs(data);
        })
        .catch(error => {
            showNotification('Error loading attendance logs');
            console.error('Error fetching attendance logs:', error);
        });
}

/**
 * Renders the attendance logs with pagination and filtering
 */
function renderAttendanceLogs(data) {
    // Apply filters
    const dateFilter = document.getElementById('date-filter').value;
    const yearFilter = document.getElementById('log-year-filter').value;
    const sectionFilter = document.getElementById('log-section-filter').value;
    const regNoSearch = document.getElementById('reg-no-search').value.toLowerCase();
    
    let filteredData = [...data];
    
    if (dateFilter) {
        filteredData = filteredData.filter(log => log.date === dateFilter);
    }
    
    if (yearFilter || sectionFilter || regNoSearch) {
        // For these filters, we need to join with student data
        filteredData = filteredData.filter(log => {
            const student = studentsData.find(s => s.uid === log.uid);
            if (!student) return false;
            
            return (!yearFilter || student.year === yearFilter) && 
                   (!sectionFilter || (student.section && student.section.includes(sectionFilter))) &&
                   (!regNoSearch || (student.reg_no && student.reg_no.toLowerCase().includes(regNoSearch)));
        });
    }
    
    // Pagination
    const totalPages = Math.ceil(filteredData.length / pageSize);
    document.getElementById('page-info').textContent = `Page ${currentPage} of ${totalPages || 1}`;
    
    const prevButton = document.getElementById('prev-page');
    const nextButton = document.getElementById('next-page');
    
    prevButton.disabled = currentPage <= 1;
    nextButton.disabled = currentPage >= totalPages || totalPages === 0;
    
    prevButton.onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            renderAttendanceLogs(data);
        }
    };
    
    nextButton.onclick = () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderAttendanceLogs(data);
        }
    };
    
    // Get current page data
    const start = (currentPage - 1) * pageSize;
    const paginatedData = filteredData.slice(start, start + pageSize);
    
    const tableBody = document.getElementById('attendance-logs-body');
    tableBody.innerHTML = '';
    
    if (paginatedData.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `<td colspan="6" style="text-align: center;">No attendance records found</td>`;
        tableBody.appendChild(emptyRow);
        return;
    }
    
    paginatedData.forEach(log => {
        const student = studentsData.find(s => s.uid === log.uid) || {};
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${log.name}</td>
            <td>${student.reg_no || 'N/A'}</td>
            <td>${student.department || 'N/A'}</td>
            <td>${log.date}</td>
            <td>${log.time}</td>
            <td class="status-${log.status.toLowerCase()}">${log.status}</td>
        `;
        tableBody.appendChild(row);
    });
}

/**
 * Sets up filter event listeners for tables
 */
function setupFilterListeners() {
    // Student filters
    const studentFilters = ['year-filter', 'section-filter', 'student-search'];
    studentFilters.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', () => loadStudentsData());
            if (id === 'student-search') {
                element.addEventListener('keyup', () => loadStudentsData());
            }
        }
    });
    
    // Attendance log filters
    const logFilters = ['date-filter', 'log-year-filter', 'log-section-filter', 'reg-no-search'];
    logFilters.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', () => {
                currentPage = 1; // Reset to first page when filtering
                loadAttendanceData();
            });
            if (id === 'reg-no-search') {
                element.addEventListener('keyup', () => {
                    currentPage = 1;
                    loadAttendanceData();
                });
            }
        }
    });
}

/**
 * Sets up export button functionality
 */
function setupExportButtons() {
    // Date range export
    document.getElementById('export-date-range').addEventListener('click', () => {
        const startDate = document.getElementById('start-date').value;
        const endDate = document.getElementById('end-date').value;
        
        if (!startDate || !endDate) {
            showExportMessage('Please select start and end dates', false);
            return;
        }
        
        exportAttendance(startDate, endDate);
    });
    
    // Export all
    document.getElementById('export-all').addEventListener('click', () => {
        exportAttendance();
    });
}

/**
 * Handles attendance data export
 */
function exportAttendance(startDate = null, endDate = null) {
    // Create a filtered data set based on date range
    let exportData = [...attendanceData];
    
    if (startDate && endDate) {
        exportData = exportData.filter(record => {
            return record.date >= startDate && record.date <= endDate;
        });
    }
    
    // Create or show the export modal with record count
    showExportModal(exportData.length, startDate, endDate, exportData);
}

/**
 * Shows export message
 */
function showExportMessage(message, isSuccess) {
    const container = document.getElementById('export-message');
    container.textContent = message;
    container.className = isSuccess ? 'success' : 'error';
    container.style.display = 'block';
}

/**
 * Shows export modal with record count and details
 * @param {number} recordCount - Number of records to export
 * @param {string} startDate - Start date for filtered export
 * @param {string} endDate - End date for filtered export
 * @param {Array} exportData - The data to be exported
 */
function showExportModal(recordCount, startDate = null, endDate = null, exportData = []) {
    // Create modal if it doesn't exist
    if (!document.getElementById('export-modal')) {
        const modal = document.createElement('div');
        modal.id = 'export-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-file-export"></i> Export Attendance Data</h3>
                    <button type="button" class="close-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="export-info">
                        <div class="record-count">
                            <div class="count-circle"><span id="export-record-count">0</span></div>
                            <p>Records Ready for Export</p>
                        </div>
                        <div class="export-details">
                            <p><strong>Date Range:</strong> <span id="export-date-range-text">All Available Data</span></p>
                            <p><strong>Export Format:</strong> CSV</p>
                            <p id="export-instruction">To export data, please run <code>export_attendance.py</code> on the Raspberry Pi.</p>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="cancel-export" class="btn-cancel"><i class="fas fa-times"></i> Cancel</button>
                    <button id="confirm-export" class="btn-primary"><i class="fas fa-download"></i> Prepare Export</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Add style for the new elements
        const style = document.createElement('style');
        style.textContent = `
            .export-info {
                display: flex;
                align-items: center;
                margin-bottom: 20px;
            }
            .record-count {
                text-align: center;
                margin-right: 20px;
            }
            .count-circle {
                width: 100px;
                height: 100px;
                border-radius: 50%;
                background-color: #4361ee;
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 10px;
                font-size: 2rem;
                font-weight: bold;
            }
            .export-details {
                flex: 1;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Update modal content
    document.getElementById('export-record-count').textContent = recordCount;
    
    // Update date range text
    const dateRangeText = document.getElementById('export-date-range-text');
    if (startDate && endDate) {
        const formattedStartDate = new Date(startDate).toLocaleDateString();
        const formattedEndDate = new Date(endDate).toLocaleDateString();
        dateRangeText.textContent = `${formattedStartDate} to ${formattedEndDate}`;
    } else {
        dateRangeText.textContent = 'All Available Data';
    }
    
    // Update export instruction text
    document.getElementById('export-instruction').textContent = 'Click "Prepare Export" to download the data as a CSV file.'
    
    // Set up event listeners
    const modal = document.getElementById('export-modal');
    const closeButtons = modal.querySelectorAll('.close-modal, #cancel-export');
    
    closeButtons.forEach(button => {
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        newButton.addEventListener('click', () => {
            closeModal('export-modal');
        });
    });
    
    // Set up confirm button
    const confirmButton = document.getElementById('confirm-export');
    const newConfirmButton = confirmButton.cloneNode(true);
    confirmButton.parentNode.replaceChild(newConfirmButton, confirmButton);
    
    newConfirmButton.addEventListener('click', () => {
        // Generate and download CSV file
        downloadCSV(exportData, startDate, endDate);
        
        // Show notification
        if (typeof showEnhancedNotification === 'function') {
            showEnhancedNotification(`Downloaded ${recordCount} records`, 'success', 'Export Complete');
        } else {
            showNotification(`Downloaded ${recordCount} records`);
        }
        
        // Close the modal
        closeModal('export-modal');
    });
    
    // Open the modal
    openModal('export-modal');
}

/**
 * Generates and downloads CSV file from attendance data
 * @param {Array} data - The attendance data to export
 * @param {string} startDate - Start date for filtered export (optional)
 * @param {string} endDate - End date for filtered export (optional)
 */
function downloadCSV(data, startDate = null, endDate = null) {
    // CSV Header
    let csvContent = 'UID,Name,Date,Time,Status\n';
    
    // Add each record to CSV
    data.forEach(record => {
        try {
            // Get base data (these should always be available)
            const uid = record.uid || '';
            const name = record.name || '';
            const status = record.status || '';
            
            // Try to format date and time, with fallbacks if invalid
            let date = '';
            let time = '';
            
            // Check if timestamp exists and is valid
            if (record.timestamp) {
                try {
                    const timestamp = new Date(record.timestamp);
                    // Test if the date is valid before using toISOString
                    if (!isNaN(timestamp.getTime())) {
                        date = timestamp.toISOString().split('T')[0];
                        time = timestamp.toTimeString().split(' ')[0];
                    } else {
                        // If date parsing failed, use raw data if available
                        date = record.date || '';
                        time = record.time || '';
                    }
                } catch (e) {
                    // If date processing fails, use raw date/time if available
                    date = record.date || '';
                    time = record.time || '';
                }
            } else if (record.date) {
                // If no timestamp but we have date field
                date = record.date;
                time = record.time || '';
            }
            
            // Create CSV row (properly escaped)
            const row = [
                uid,
                `"${name.replace(/"/g, '""')}"`,  // Escape quotes in names
                date,
                time,
                status
            ];
            
            csvContent += row.join(',') + '\n';
        } catch (error) {
            console.error('Error processing record for CSV:', error, record);
            // Skip this record if it causes an error
        }
    });
    
    // Create a blob with the CSV data
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Create filename based on date range
    let filename = 'attendance';
    if (startDate && endDate) {
        const start = startDate.replace(/-/g, '');
        const end = endDate.replace(/-/g, '');
        filename += `_${start}_to_${end}`;
    } else {
        const now = new Date();
        filename += `_full_${now.toISOString().split('T')[0].replace(/-/g, '')}`;
    }
    filename += '.csv';
    
    // Create download link and trigger download
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * Starts auto-refresh for today's attendance
 */
function startAutoRefresh() {
    // Clear any existing timers
    stopAutoRefresh();
    
    // Set up new refresh timer
    refreshTimer = setInterval(() => {
        loadTodayAttendance();
    }, REFRESH_INTERVAL);
    
    // Update countdown display
    updateRefreshCountdown(REFRESH_INTERVAL / 1000);
}

/**
 * Stops the auto-refresh timers
 */
function stopAutoRefresh() {
    if (refreshTimer) clearInterval(refreshTimer);
    if (countdownInterval) clearInterval(countdownInterval);
}

/**
 * Updates the refresh countdown timer display
 */
function updateRefreshCountdown(seconds) {
    const refreshTimerElement = document.getElementById('refresh-timer');
    refreshTimerElement.textContent = `Auto refresh in ${seconds}s`;
    
    if (countdownInterval) clearInterval(countdownInterval);
    
    let countdown = seconds;
    countdownInterval = setInterval(() => {
        countdown--;
        if (countdown < 0) {
            countdown = REFRESH_INTERVAL / 1000;
        }
        refreshTimerElement.textContent = `Auto refresh in ${countdown}s`;
    }, 1000);
}

/**
 * Shows a notification toast
 * This is the original notification system that has been enhanced
 * with a more visually appealing version in animations.js
 */
function showNotification(message, isError = false) {
    // Check if enhanced notification exists and use it instead
    if (typeof showEnhancedNotification === 'function') {
        // Use the enhanced notification system
        showEnhancedNotification(
            message,
            isError ? 'error' : 'success'
        );
        return;
    }
    
    // Fall back to the original notification if enhanced is not available
    const notification = document.getElementById('notification');
    const messageElement = document.getElementById('notification-message');
    
    messageElement.textContent = message;
    notification.style.display = 'block';
    
    // Add error styling if it's an error
    if (isError) {
        notification.classList.add('error');
    } else {
        notification.classList.remove('error');
    }
    
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

/**
 * Set up modal controls for all modals
 */
function setupModalControls() {
    // Close modals with data-modal attribute
    document.querySelectorAll('.close-modal, .btn-cancel').forEach(element => {
        if (element.hasAttribute('data-modal')) {
            element.addEventListener('click', () => {
                const modalId = element.getAttribute('data-modal');
                document.getElementById(modalId).classList.remove('active');
            });
        }
    });
    
    // Set up registration button
    document.getElementById('register-student-btn').addEventListener('click', () => {
        openModal('registration-modal');
    });
    
    // Set up delete from details
    document.getElementById('delete-from-details').addEventListener('click', () => {
        const uid = document.getElementById('detail-uid').textContent;
        const name = document.getElementById('detail-name').textContent;
        closeModal('student-details-modal');
        confirmDeleteStudent(uid, name);
    });
}

/**
 * Create the student details modal
 */
function createStudentDetailsModal() {
    const modal = document.createElement('div');
    modal.id = 'student-details-modal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="fas fa-user-graduate"></i> Student Details</h3>
                <button type="button" class="close-modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="student-profile">
                    <div class="student-image-container">
                        <img id="student-profile-image" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23ccc' d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/%3E%3C/svg%3E" alt="Student profile picture">
                        <div id="student-initials-avatar" class="initials-avatar">A</div>
                    </div>
                    <div class="student-info">
                        <h2 id="detail-name">Student Name</h2>
                        <p id="detail-reg-no">Reg No: N/A</p>
                        <p>RFID UID: <span id="detail-uid">-</span></p>
                        <p>Department: <span id="detail-department">-</span></p>
                        <p>Year: <span id="detail-year">-</span></p>
                        <p>Section: <span id="detail-section">-</span></p>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn-primary close-modal"><i class="fas fa-times"></i> Close</button>
            </div>
        </div>
    `;
    
    // Add styles for the new elements
    const style = document.createElement('style');
    style.textContent = `
        .student-profile {
            display: flex;
            align-items: flex-start;
            margin-bottom: 20px;
        }
        .student-image-container {
            width: 100px;
            height: 100px;
            margin-right: 20px;
            border-radius: 50%;
            overflow: hidden;
            background-color: #f0f0f0;
            position: relative;
        }
        #student-profile-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .initials-avatar {
            display: none;
            width: 100%;
            height: 100%;
            align-items: center;
            justify-content: center;
            font-size: 3rem;
            font-weight: bold;
            color: white;
            background-color: #4361ee;
            position: absolute;
            top: 0;
            left: 0;
        }
        .student-info {
            flex: 1;
        }
        .student-info h2 {
            margin-top: 0;
            margin-bottom: 10px;
            color: var(--primary-color);
        }
        .student-info p {
            margin: 5px 0;
            font-size: 14px;
        }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(modal);
    
    // Add event listeners for closing the modal
    const closeButtons = modal.querySelectorAll('.close-modal');
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            closeModal('student-details-modal');
        });
    });
}

/**
 * Open a modal by ID
 */
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

/**
 * Close a modal by ID
 */
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

/**
 * Setup student registration form
 */
function setupRegistrationForm() {
    const form = document.getElementById('student-registration-form');
    let pollingInterval = null;
    let lastScannedUid = null;
    
    // Set up scan button
    document.getElementById('scan-rfid-btn').addEventListener('click', function() {
        const scanStatusEl = document.getElementById('scan-status');
        const uidInput = document.getElementById('reg-uid');
        
        // Update UI to show scanning state
        this.disabled = true;
        scanStatusEl.textContent = 'Waiting for card scan...';
        scanStatusEl.className = 'scan-status scanning';
        
        // Start polling for new UID
        if (pollingInterval) clearInterval(pollingInterval);
        
        pollingInterval = setInterval(() => {
            fetch(`${API_BASE_URL}/latest-uid`)
                .then(response => response.json())
                .then(data => {
                    if (data.uid && data.uid !== lastScannedUid) {
                        lastScannedUid = data.uid;
                        uidInput.value = data.uid;
                        scanStatusEl.textContent = `Card detected! UID: ${data.uid}`;
                        scanStatusEl.className = 'scan-status success';
                        clearInterval(pollingInterval);
                        pollingInterval = null;
                        this.disabled = false;
                    }
                })
                .catch(error => {
                    console.error('Error checking for scanned card:', error);
                    scanStatusEl.textContent = 'Error connecting to scanner';
                    scanStatusEl.className = 'scan-status error';
                    clearInterval(pollingInterval);
                    pollingInterval = null;
                    this.disabled = false;
                });
        }, 1000);
        
        // Stop polling after 30 seconds if no card detected
        setTimeout(() => {
            if (pollingInterval) {
                clearInterval(pollingInterval);
                pollingInterval = null;
                this.disabled = false;
                scanStatusEl.textContent = 'No card detected. Try again.';
                scanStatusEl.className = 'scan-status error';
            }
        }, 30000);
    });
    
    // Form submission
    document.getElementById('submit-registration').addEventListener('click', () => {
        // Get form data
        const uid = document.getElementById('reg-uid').value.trim();
        const name = document.getElementById('reg-name').value.trim();
        const regNo = document.getElementById('reg-reg-no').value.trim();
        const department = document.getElementById('reg-department').value.trim();
        const year = document.getElementById('reg-year').value;
        const section = document.getElementById('reg-section').value.trim();
        
        // Validate
        if (!uid || !name || !regNo || !department || !year || !section) {
            showNotification('Please fill in all required fields', true);
            return;
        }
        
        registerStudent({
            uid,
            name,
            reg_no: regNo,
            department,
            year,
            section
        });
    });
    
    // Reset polling when modal is closed
    document.querySelectorAll('[data-modal="registration-modal"]').forEach(element => {
        element.addEventListener('click', () => {
            if (pollingInterval) {
                clearInterval(pollingInterval);
                pollingInterval = null;
                document.getElementById('scan-rfid-btn').disabled = false;
                document.getElementById('scan-status').textContent = '';
                document.getElementById('scan-status').className = 'scan-status';
            }
        });
    });
}

/**
 * Register a new student through the API
 */
function registerStudent(studentData) {
    fetch(`${API_BASE_URL}/students`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(studentData)
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.detail || `Error ${response.status}: ${response.statusText}`);
            });
        }
        return response.json();
    })
    .then(data => {
        // Standard notification is still shown for compatibility
        showNotification(`Student ${studentData.name} registered successfully!`);
        
        // Reset form and close modal
        document.getElementById('student-registration-form').reset();
        closeModal('registration-modal');
        
        // Refresh student data
        loadStudentsData();
        
        // If on dashboard, update stats
        if (document.getElementById('dashboard').classList.contains('active')) {
            loadDashboardData();
        }
        
        // Show celebratory animation with confetti if available
        if (typeof showCelebration === 'function') {
            showCelebration(studentData.name);
        }
    })
    .catch(error => {
        console.error('Error registering student:', error);
        showNotification(`Error: ${error.message}`, true);
    });
}

/**
 * View student details
 */
function viewStudentDetails(uid) {
    // Create student details modal if it doesn't exist
    if (!document.getElementById('student-details-modal')) {
        createStudentDetailsModal();
        
        // Add a small delay to ensure DOM is updated before continuing
        setTimeout(() => {
            fetchAndDisplayStudentDetails(uid);
        }, 100);
    } else {
        fetchAndDisplayStudentDetails(uid);
    }
}

/**
 * Fetch and display student details in the modal
 */
function fetchAndDisplayStudentDetails(uid) {
    fetch(`${API_BASE_URL}/students/${uid}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(student => {
            // Ensure all elements exist before manipulating them
            const detailNameEl = document.getElementById('detail-name');
            const detailRegNoEl = document.getElementById('detail-reg-no');
            const detailUidEl = document.getElementById('detail-uid');
            const detailDeptEl = document.getElementById('detail-department');
            const detailYearEl = document.getElementById('detail-year');
            const detailSectionEl = document.getElementById('detail-section');
            const profileImgEl = document.getElementById('student-profile-image');
            const initialsAvatarEl = document.getElementById('student-initials-avatar');
            
            // Safely update the elements if they exist
            if (detailNameEl) detailNameEl.textContent = student.name;
            if (detailRegNoEl) detailRegNoEl.textContent = `Reg No: ${student.reg_no || 'N/A'}`;
            if (detailUidEl) detailUidEl.textContent = student.uid;
            if (detailDeptEl) detailDeptEl.textContent = student.department || 'N/A';
            if (detailYearEl) detailYearEl.textContent = student.year || 'N/A';
            if (detailSectionEl) detailSectionEl.textContent = student.section || 'N/A';
            
            // Update student profile image if elements exist
            if (profileImgEl && initialsAvatarEl) {
                if (student.image_url) {
                    profileImgEl.src = student.image_url;
                    profileImgEl.alt = `${student.name}'s profile picture`;
                    profileImgEl.style.display = 'block';
                    initialsAvatarEl.style.display = 'none';
                } else {
                    // Use default image with first letter of student's name
                    const firstLetter = student.name ? student.name.charAt(0).toUpperCase() : '?';
                    profileImgEl.style.display = 'none'; // Hide the img element
                    
                    initialsAvatarEl.textContent = firstLetter;
                    initialsAvatarEl.style.display = 'flex'; // Show the initials avatar
                    
                    // Set a consistent background color based on the name
                    const colorIndex = student.name.charCodeAt(0) % 5;
                    const colors = ['#4361ee', '#3a0ca3', '#f72585', '#7209b7', '#4cc9f0'];
                    initialsAvatarEl.style.backgroundColor = colors[colorIndex];
                }
            }
            
            // Open the modal
            openModal('student-details-modal');
        })
        .catch(error => {
            console.error('Error fetching student details:', error);
            showNotification(`Error fetching student details: ${error.message}`, true);
        });
}

/**
 * Confirm student deletion with a modal
 */
function confirmDeleteStudent(uid, name) {
    // Create modal if it doesn't exist
    if (!document.getElementById('delete-modal')) {
        const modal = document.createElement('div');
        modal.id = 'delete-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-trash-alt"></i> Confirm Deletion</h3>
                    <button type="button" class="close-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <p>Are you sure you want to delete <span id="student-to-delete"></span>?</p>
                    <p class="warning">This will permanently remove the student and all their attendance records.</p>
                </div>
                <div class="modal-footer">
                    <button id="cancel-delete" class="btn-cancel"><i class="fas fa-times"></i> Cancel</button>
                    <button id="confirm-delete" class="btn-danger"><i class="fas fa-trash"></i> Delete</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    const modal = document.getElementById('delete-modal');
    document.getElementById('student-to-delete').textContent = `${name} (${uid})`;
    
    // Update event listeners every time to avoid duplicates
    const closeButtons = modal.querySelectorAll('.close-modal, #cancel-delete');
    closeButtons.forEach(button => {
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        newButton.addEventListener('click', () => {
            closeModal('delete-modal');
        });
    });
    
    // Remove any existing event listeners on confirm button
    const confirmButton = document.getElementById('confirm-delete');
    const newConfirmButton = confirmButton.cloneNode(true);
    confirmButton.parentNode.replaceChild(newConfirmButton, confirmButton);
    
    // Add new event listener for this specific deletion
    newConfirmButton.addEventListener('click', () => {
        deleteStudent(uid, name);
        closeModal('delete-modal');
    });
    
    // Open the modal using the same method as other modals
    openModal('delete-modal');
}

/**
 * Delete a student via the API
 */
function deleteStudent(uid, name) {
    fetch(`${API_BASE_URL}/students/${uid}`, {
        method: 'DELETE',
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.detail || `Error ${response.status}: ${response.statusText}`);
            });
        }
        return response.json();
    })
    .then(data => {
        showNotification(data.message || `Student deleted successfully`);
        
        // Update data and refresh tables
        studentsData = studentsData.filter(student => student.uid !== uid);
        loadStudentsData();
        
        // If on dashboard, also update stats and charts
        if (document.getElementById('dashboard').classList.contains('active')) {
            updateStudentStats();
            updateDepartmentChart();
        }
    })
    .catch(error => {
        console.error('Error deleting student:', error);
        showNotification(`Error deleting student: ${error.message}`, true);
    });
}

/**
 * Generates a random color for charts
 */
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}
