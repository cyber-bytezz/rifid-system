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
const API_BASE_URL = 'http://192.168.22.201:8000';
const REFRESH_INTERVAL = 10000; // 10 seconds

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
 * Creates or updates the department distribution chart
 */
function updateDepartmentChart() {
    if (!studentsData.length) return;
    
    // Get all unique departments
    const departments = {};
    studentsData.forEach(student => {
        if (!student.department) return;
        
        if (departments[student.department]) {
            departments[student.department]++;
        } else {
            departments[student.department] = 1;
        }
    });
    
    const labels = Object.keys(departments);
    const data = Object.values(departments);
    
    // Generate random colors for each department
    const colors = labels.map(() => getRandomColor());
    
    const ctx = document.getElementById('department-chart').getContext('2d');
    
    if (departmentChart) {
        departmentChart.destroy();
    }
    
    departmentChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderColor: 'white',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                }
            }
        }
    });
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
    
    if (filteredData.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `<td colspan="7" style="text-align: center;">No students found</td>`;
        tableBody.appendChild(emptyRow);
        return;
    }
    
    filteredData.forEach(student => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${student.uid}</td>
            <td>${student.name}</td>
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
    // Display message
    showExportMessage('To export data, please run export_attendance.py on the Raspberry Pi', true);
    
    // Create a filtered data set based on date range
    let exportData = [...attendanceData];
    
    if (startDate && endDate) {
        exportData = exportData.filter(record => {
            return record.date >= startDate && record.date <= endDate;
        });
    }
    
    // Since we don't have an export API endpoint, we'll just show a success message
    showNotification(`Export prepared with ${exportData.length} records`);
}

/**
 * Shows export message
 */
function showExportMessage(message, isSuccess) {
    const messageElement = document.getElementById('export-message');
    messageElement.textContent = message;
    messageElement.style.color = isSuccess ? 'var(--primary-color)' : 'var(--danger-color)';
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
 */
function showNotification(message, isError = false) {
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
    fetch(`${API_BASE_URL}/students/${uid}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(student => {
            // Update modal with student details
            document.getElementById('detail-name').textContent = student.name;
            document.getElementById('detail-reg-no').textContent = `Reg No: ${student.reg_no}`;
            document.getElementById('detail-uid').textContent = student.uid;
            document.getElementById('detail-department').textContent = student.department;
            document.getElementById('detail-year').textContent = student.year;
            document.getElementById('detail-section').textContent = student.section;
            
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
                    <h3>Confirm Deletion</h3>
                    <span class="close-modal">&times;</span>
                </div>
                <div class="modal-body">
                    <p>Are you sure you want to delete <span id="student-to-delete"></span>?</p>
                    <p class="warning">This will permanently remove the student and all their attendance records.</p>
                </div>
                <div class="modal-footer">
                    <button id="cancel-delete" class="btn-cancel">Cancel</button>
                    <button id="confirm-delete" class="btn-danger">Delete</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Set up event listeners for the modal
        document.querySelector('.close-modal').addEventListener('click', () => {
            modal.style.display = 'none';
        });
        
        document.getElementById('cancel-delete').addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }
    
    const modal = document.getElementById('delete-modal');
    document.getElementById('student-to-delete').textContent = `${name} (${uid})`;
    modal.style.display = 'block';
    
    // Remove any existing event listeners on confirm button
    const confirmButton = document.getElementById('confirm-delete');
    const newConfirmButton = confirmButton.cloneNode(true);
    confirmButton.parentNode.replaceChild(newConfirmButton, confirmButton);
    
    // Add new event listener for this specific deletion
    newConfirmButton.addEventListener('click', () => {
        deleteStudent(uid, name);
        modal.style.display = 'none';
    });
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
