import RPi.GPIO as GPIO
import time

BUZZER_PIN = 18  # GPIO 18 = Physical Pin 12

# Setup
GPIO.setmode(GPIO.BCM)
GPIO.setwarnings(False)
GPIO.setup(BUZZER_PIN, GPIO.OUT)

try:
    print("🔔 Testing buzzer...")
    for i in range(3):
        GPIO.output(BUZZER_PIN, GPIO.HIGH)
        print(f"Beep {i+1}")
        time.sleep(0.3)
        GPIO.output(BUZZER_PIN, GPIO.LOW)
        time.sleep(0.3)

    print("✅ Buzzer test complete.")

except KeyboardInterrupt:
    print("\n🛑 Test stopped.")

finally:
    GPIO.output(BUZZER_PIN, GPIO.LOW)
    GPIO.cleanup()
