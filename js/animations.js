/**
 * RFID Attendance System - Enhanced UX Features
 * 
 * This script adds vibrant animations, notifications, and interactive
 * elements to enhance the user experience of the RFID system.
 */

// ======= Global State =======
const animationSettings = {
    enabled: true,       // Main toggle for all animations
    soundEnabled: true,  // Toggle for sound effects
    darkMode: false      // Dark mode state
};

// ======= Sound Effects =======
const sounds = {
    success: new Howl({
        src: ['https://assets.mixkit.co/active_storage/sfx/2005/2005-preview.mp3'],
        volume: 0.5
    }),
    error: new Howl({
        src: ['https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3'],
        volume: 0.5
    }),
    notification: new Howl({
        src: ['https://assets.mixkit.co/active_storage/sfx/1518/1518-preview.mp3'],
        volume: 0.3
    })
};

// ======= DOM Elements =======
document.addEventListener('DOMContentLoaded', () => {
    // Set up celebration animation
    setupCelebrationAnimation();
    
    // Set up enhanced notification system
    setupNotificationSystem();
    
    // Set up settings panel
    setupSettingsPanel();
    
    // Monitor for registration success
    monitorForRegistrationSuccess();
    
    // Check API and system status
    checkSystemStatus();
});

/**
 * Sets up the celebration animation for successful student registration
 */
function setupCelebrationAnimation() {
    const celebrationContainer = document.getElementById('celebration-container');
    const celebrationContent = celebrationContainer.querySelector('.celebration-content');
    const closeButton = document.getElementById('celebration-close');
    
    // Add animation classes
    celebrationContent.classList.add('animate__bounceIn');
    
    // Close button event listener
    closeButton.addEventListener('click', () => {
        celebrationContent.classList.remove('animate__bounceIn');
        celebrationContent.classList.add('animate__bounceOut');
        
        // Hide container after animation completes
        setTimeout(() => {
            celebrationContainer.classList.remove('active');
            setTimeout(() => {
                celebrationContent.classList.remove('animate__bounceOut');
                celebrationContent.classList.add('animate__bounceIn');
            }, 500);
        }, 700);
    });
}

/**
 * Shows celebration animation with confetti
 * @param {string} name - Name of the student to display in message
 */
function showCelebration(name = '') {
    if (!animationSettings.enabled) return;
    
    const celebrationContainer = document.getElementById('celebration-container');
    const message = document.querySelector('.celebration-message');
    
    // Set custom message if name is provided
    if (name) {
        message.textContent = `${name} has been registered successfully!`;
    } else {
        message.textContent = 'Student registered successfully!';
    }
    
    // Show container
    celebrationContainer.classList.add('active');
    
    // Play success sound
    if (animationSettings.soundEnabled) {
        sounds.success.play();
    }
    
    // Launch confetti
    const confettiCanvas = document.getElementById('confetti-canvas');
    const myConfetti = confetti.create(confettiCanvas, {
        resize: true,
        useWorker: true
    });
    
    myConfetti({
        particleCount: 150,
        spread: 160,
        origin: { y: 0.6 },
        colors: ['#4361ee', '#3f37c9', '#38b6ff', '#00c896', '#ffd166'],
        disableForReducedMotion: true
    });
    
    // More confetti for fun!
    setTimeout(() => {
        myConfetti({
            particleCount: 50,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ['#4361ee', '#3f37c9', '#38b6ff']
        });
        
        myConfetti({
            particleCount: 50,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ['#00c896', '#ffd166', '#f72585']
        });
    }, 750);
}

/**
 * Sets up the enhanced notification system
 */
function setupNotificationSystem() {
    // This function just sets up the container
    // The actual notification creation happens in showNotification
}

/**
 * Shows an enhanced notification toast
 * @param {string} message - Message to display
 * @param {string} type - Notification type (success, error, warning, info)
 * @param {string} title - Optional title for the notification
 * @param {number} duration - Duration in ms (default: 5000)
 */
function showEnhancedNotification(message, type = 'info', title = '', duration = 5000) {
    // Make sure notification center exists
    let notificationCenter = document.getElementById('notification-center');
    if (!notificationCenter) {
        // Create notification center if it doesn't exist
        notificationCenter = document.createElement('div');
        notificationCenter.id = 'notification-center';
        notificationCenter.className = 'notification-center';
        document.body.appendChild(notificationCenter);
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification-toast ${type}`;
    
    // Get appropriate icon and title
    let icon, notificationTitle;
    switch (type) {
        case 'success':
            icon = 'check-circle';
            notificationTitle = title || 'Success';
            if (animationSettings.soundEnabled) sounds.success.play();
            break;
        case 'error':
            icon = 'times-circle';
            notificationTitle = title || 'Error';
            if (animationSettings.soundEnabled) sounds.error.play();
            break;
        case 'warning':
            icon = 'exclamation-triangle';
            notificationTitle = title || 'Warning';
            if (animationSettings.soundEnabled) sounds.notification.play();
            break;
        case 'info':
        default:
            icon = 'info-circle';
            notificationTitle = title || 'Information';
            if (animationSettings.soundEnabled) sounds.notification.play();
    }
    
    // Set notification content with more modern structure and improved layout
    notification.innerHTML = `
        <div class="icon">
            <i class="fas fa-${icon}"></i>
        </div>
        <div class="content">
            <div class="title">${notificationTitle}</div>
            <div class="message">${message}</div>
        </div>
        <button class="close" aria-label="Close notification">
            <i class="fas fa-times"></i>
        </button>
        <div class="progress">
            <div class="progress-bar"></div>
        </div>
    `;
    
    // Limit number of notifications (max 4 at a time)
    const existingNotifications = notificationCenter.querySelectorAll('.notification-toast');
    if (existingNotifications.length >= 4) {
        notificationCenter.removeChild(existingNotifications[0]);
    }
    
    // Add to notification center
    notificationCenter.appendChild(notification);
    
    // Wait a tiny bit before showing animation (for smoother appearance)
    setTimeout(() => {
        // Animate progress bar
        const progressBar = notification.querySelector('.progress-bar');
        progressBar.style.transition = `width ${duration}ms linear`;
        
        // Add active class and start animation
        notification.classList.add('active');
        requestAnimationFrame(() => {
            progressBar.style.width = '0%';
        });
    }, 10);
    
    // Set up close functionality
    const closeBtn = notification.querySelector('.close');
    closeBtn.addEventListener('click', () => {
        clearTimeout(timeout);
        removeNotification(notification);
    });
    
    // Auto remove after duration
    const timeout = setTimeout(() => {
        removeNotification(notification);
    }, duration);
    
    return notification;
}

/**
 * Helper function to remove notification with animation
 */
function removeNotification(notification) {
    notification.classList.remove('active');
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(-20px)';
    
    // Remove element after animation completes
    notification.addEventListener('transitionend', function handler() {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
        notification.removeEventListener('transitionend', handler);
    });
}

/**
 * Sets up the settings panel functionality
 * Handles toggling settings panel, dark mode, animations, and sound effects
 */
function setupSettingsPanel() {
    const settingsButton = document.getElementById('settings-button');
    const settingsPanel = document.getElementById('settings-panel');
    const closeSettings = document.getElementById('close-settings');
    
    // Toggle switches
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const animationsToggle = document.getElementById('animations-toggle');
    const soundToggle = document.getElementById('sound-toggle');
    const refreshInterval = document.getElementById('refresh-interval');
    const refreshValue = document.getElementById('refresh-value');
    
    // Load saved settings from local storage
    loadSettings();
    
    // Settings button click event
    settingsButton.addEventListener('click', () => {
        settingsPanel.classList.add('active');
        // Update system status when panel opens
        checkSystemStatus();
    });
    
    // Close button click event
    closeSettings.addEventListener('click', () => {
        settingsPanel.classList.remove('active');
    });
    
    // Close panel when clicking outside
    document.addEventListener('click', function(event) {
        const settingsButton = document.getElementById('settings-button');
        const settingsPanel = document.getElementById('settings-panel');
        
        if (settingsPanel && settingsPanel.classList.contains('active') && 
            !settingsPanel.contains(event.target) && 
            event.target !== settingsButton) {
            settingsPanel.classList.remove('active');
        }
    });
    
    // Dark mode toggle
    darkModeToggle.addEventListener('change', () => {
        if (darkModeToggle.checked) {
            document.body.classList.add('dark-mode');
            animationSettings.darkMode = true;
        } else {
            document.body.classList.remove('dark-mode');
            animationSettings.darkMode = false;
        }
        saveSettings();
    });
    
    // Animations toggle
    animationsToggle.addEventListener('change', () => {
        animationSettings.enabled = animationsToggle.checked;
        saveSettings();
    });
    
    // Sound effects toggle
    soundToggle.addEventListener('change', () => {
        animationSettings.soundEnabled = soundToggle.checked;
        saveSettings();
    });
    
    // Auto refresh interval
    refreshInterval.addEventListener('input', () => {
        const value = refreshInterval.value;
        refreshValue.textContent = value > 0 ? `${value}s` : 'Off';
        animationSettings.refreshInterval = parseInt(value, 10);
        saveSettings();
    });
    
    refreshInterval.addEventListener('change', () => {
        const value = parseInt(refreshInterval.value, 10);
        
        // Update refresh timer
        if (window.refreshTimer) {
            clearInterval(window.refreshTimer);
            window.refreshTimer = null;
        }
        
        if (value > 0) {
            setupAutoRefresh(value);
            showEnhancedNotification(`Auto-refresh set to ${value} seconds`, 'info');
        }
    });
}

/**
 * Save settings to local storage
 */
function saveSettings() {
    localStorage.setItem('rfidSystemSettings', JSON.stringify(animationSettings));
}

/**
 * Load settings from local storage
 */
function loadSettings() {
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const animationsToggle = document.getElementById('animations-toggle');
    const soundToggle = document.getElementById('sound-toggle');
    const refreshInterval = document.getElementById('refresh-interval');
    const refreshValue = document.getElementById('refresh-value');
    
    // Get saved settings
    const savedSettings = localStorage.getItem('rfidSystemSettings');
    
    if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        
        // Update animation settings object
        Object.assign(animationSettings, settings);
    }
    
    // Close settings panel when clicking outside
    document.addEventListener('click', (event) => {
        if (settingsPanel.classList.contains('active') && 
            !settingsPanel.contains(event.target) && 
            event.target !== settingsButton) {
            settingsPanel.classList.remove('active');
        }
    });
}

/**
 * Monitors for registration success and triggers celebration
 */
function monitorForRegistrationSuccess() {
    const submitButton = document.getElementById('submit-registration');
    
    if (submitButton) {
        // Store the original click event listener
        const originalClickListener = submitButton.onclick;
        
        // Replace with enhanced version
        submitButton.onclick = function(event) {
            // Get the form
            const form = document.getElementById('student-registration-form');
            
            // Check if the form is valid
            if (form.checkValidity()) {
                // Get student name for personalized message
                const nameInput = document.getElementById('reg-name');
                const studentName = nameInput ? nameInput.value : '';
                
                // Call the original click handler
                if (typeof originalClickListener === 'function') {
                    originalClickListener.call(this, event);
                }
                
                // Add a small delay to show celebration after registration completes
                setTimeout(() => {
                    // Show celebration animation
                    showCelebration(studentName);
                }, 1000);
            } else {
                // Form validation failed
                showEnhancedNotification('Please fill all required fields correctly', 'warning');
            }
        };
    }
}

/**
 * Checks API and system status
 */
function checkSystemStatus() {
    // API status indicator
    fetch(`${API_BASE_URL}/health-check`)
        .then(response => {
            if (response.ok) {
                updateStatusIndicator('Backend API', 'online');
            } else {
                updateStatusIndicator('Backend API', 'warning');
            }
        })
        .catch(() => {
            updateStatusIndicator('Backend API', 'offline');
        });
    
    // Check RFID reader status via a status endpoint
    fetch(`${API_BASE_URL}/rfid-status`)
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                throw new Error('Failed to check RFID status');
            }
        })
        .then(data => {
            if (data.connected) {
                updateStatusIndicator('RFID Reader', 'online');
            } else {
                updateStatusIndicator('RFID Reader', 'offline');
            }
        })
        .catch(() => {
            // Assume it's online if we can't check (default state)
            updateStatusIndicator('RFID Reader', 'online');
        });
}

/**
 * Updates a status indicator
 * @param {string} name - Name of the status indicator
 * @param {string} status - Status (online, offline, warning)
 */
function updateStatusIndicator(name, status) {
    const statusItems = document.querySelectorAll('.status-item');
    
    statusItems.forEach(item => {
        const itemName = item.querySelector('span').textContent;
        if (itemName === name) {
            const indicator = item.querySelector('.status-indicator');
            
            // Remove all status classes
            indicator.classList.remove('online', 'offline', 'warning');
            
            // Add appropriate class
            indicator.classList.add(status);
        }
    });
}

// Note: We're no longer overriding the original showNotification function here
// The app.js file now directly checks for and uses showEnhancedNotification
// This prevents duplicate notifications from appearing
