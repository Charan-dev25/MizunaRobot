#include <SPI.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SH110X.h>
#include <MPU6050.h>


#define i2c_Address 0x3C
#define SCREEN_WIDTH 128 // OLED display width, in pixels
#define SCREEN_HEIGHT 64 // OLED display height, in pixels
#define OLED_RESET -1  
Adafruit_SH1106G display = Adafruit_SH1106G(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

#include <FluxGarage_RoboEyes.h>
roboEyes roboEyes; // create RoboEyes instance

// MPU6050 sensor instance
MPU6050 mpu;

// Variables for MPU6050 data
int16_t ax, ay, az;
int16_t gx, gy, gz;
float accelerationMagnitude;
float previousAcceleration = 0;
unsigned long lastMotionTime = 0;
unsigned long lastExpressionChange = 0;
bool isShaking = false;
bool isTilted = false;
int tiltDirection = 0; // 0=none, 1=left, 2=right, 3=forward, 4=backward
float tiltAngleX = 0;
float tiltAngleY = 0;
int currentMood = 0; // 0=DEFAULT, 1=HAPPY, 2=ANGRY, 3=TIRED, 4=CURIOUS


void setup()   {
  Serial.begin(9600);

  delay(250); // wait for the OLED to power up
  display.begin(i2c_Address, true); // Address 0x3C default
  //display.setContrast (0); // dim display
  
  // Initialize MPU6050
  Serial.println("Initializing MPU6050...");
  mpu.initialize();
  
  // Test connection
  if (mpu.testConnection()) {
    Serial.println("MPU6050 connection successful");
  } else {
    Serial.println("MPU6050 connection failed");
  }
  
  // Startup robo eyes
  roboEyes.begin(SCREEN_WIDTH, SCREEN_HEIGHT, 100); // screen-width, screen-height, max framerate

  // Define some automated eyes behaviour (reduced for motion control)
  roboEyes.setAutoblinker(ON, 4, 2); // Start auto blinker animation cycle
  roboEyes.setIdleMode(OFF, 2, 2); // Turn off idle mode - we'll control movement with MPU6050
  
  // Define eye shapes, all values in pixels
  //roboEyes.setWidth(36, 36); // byte leftEye, byte rightEye
  //roboEyes.setHeight(36, 36); // byte leftEye, byte rightEye
  //roboEyes.setBorderradius(8, 8); // byte leftEye, byte rightEye
  //roboEyes.setSpacebetween(10); // int space -> can also be negative

  // Cyclops mode
  //roboEyes.setCyclops(ON); // bool on/off -> if turned on, robot has only on eye

  // Define mood, curiosity and position
  //roboEyes.setMood(DEFAULT); // mood expressions, can be TIRED, ANGRY, HAPPY, DEFAULT
  //roboEyes.setPosition(DEFAULT); // cardinal directions, can be N, NE, E, SE, S, SW, W, NW, DEFAULT (default = horizontally and vertically centered)
  //roboEyes.setCuriosity(ON); // bool on/off -> when turned on, height of the outer eyes increases when moving to the very left or very right

  // Set horizontal or vertical flickering
  //roboEyes.setHFlicker(ON, 2); // bool on/off, byte amplitude -> horizontal flicker: alternately displacing the eyes in the defined amplitude in pixels
  //roboEyes.setVFlicker(ON, 2); // bool on/off, byte amplitude -> vertical flicker: alternately displacing the eyes in the defined amplitude in pixels

  // Play prebuilt oneshot animations
  //roboEyes.anim_confused(); // confused - eyes shaking left and right
  //roboEyes.anim_laugh(); // laughing - eyes shaking up and down
  
} // end of setup

// Function to read MPU6050 data and detect motion patterns
// The default (stable) position is when the sensor is flat/horizontal (Z axis up)
void readMPU6050() {
  mpu.getMotion6(&ax, &ay, &az, &gx, &gy, &gz);
  
  // Calculate total acceleration magnitude
  accelerationMagnitude = sqrt(ax*ax + ay*ay + az*az);
  
  // Detect shaking (sudden acceleration changes)
  float accelDiff = abs(accelerationMagnitude - previousAcceleration);
  if (accelDiff > 3000) { // Threshold for shake detection
    isShaking = true;
    lastMotionTime = millis();
  } else if (millis() - lastMotionTime > 1000) {
    isShaking = false;
  }
  
  // Calculate tilt angles in degrees
  // When the sensor is flat (horizontal, Z axis up), tiltAngleX and tiltAngleY are near zero
  tiltAngleX = atan2(ay, az) * 180 / PI;  // Roll (left/right tilt)
  tiltAngleY = atan2(-ax, sqrt(ay*ay + az*az)) * 180 / PI;  // Pitch (forward/backward tilt)
  
  // Determine tilt direction and set flags
  tiltDirection = 0; // Reset tilt direction
  isTilted = false;
  
  // Check for significant tilt (threshold: 20 degrees)
  // Only set isTilted if the sensor is rotated significantly from horizontal
  if (abs(tiltAngleX) > 20 || abs(tiltAngleY) > 20) {
    isTilted = true;
    
    // Determine primary tilt direction
    if (abs(tiltAngleX) > abs(tiltAngleY)) {
      // Left/Right tilt is stronger
      if (tiltAngleX > 20) {
        tiltDirection = 1; // Tilted LEFT
      } else if (tiltAngleX < -20) {
        tiltDirection = 2; // Tilted RIGHT
      }
    } else {
      // Forward/Backward tilt is stronger
      if (tiltAngleY > 20) {
        tiltDirection = 3; // Tilted FORWARD (up)
      } else if (tiltAngleY < -20) {
        tiltDirection = 4; // Tilted BACKWARD (down)
      }
    }
  }
  // If not tilted, the sensor is in horizontal position (default)
  previousAcceleration = accelerationMagnitude;
}

// Function to update expressions based on motion
void updateExpressions() {
  unsigned long currentTime = millis();
  
  // Only change expressions every 500ms to avoid rapid switching
  if (currentTime - lastExpressionChange < 500) {
    return;
  }
  
  // Always default mood unless tilted
  if (isTilted) {
    switch (tiltDirection) {
      case 1: // Tilted LEFT - Angry
      case 2: // Tilted RIGHT - Angry
        if (currentMood != 2) {
          roboEyes.setMood(ANGRY);
          roboEyes.setCuriosity(OFF);
          currentMood = 2;
          Serial.println("Expression: ANGRY (tilted left/right)");
        }
        break;
      case 3: // Tilted FORWARD - Curious
      case 4: // Tilted BACKWARD - Curious
        if (currentMood != 4) {
          roboEyes.setMood(DEFAULT);
          roboEyes.setCuriosity(ON);
          currentMood = 4;
          Serial.println("Expression: CURIOUS (tilted forward/backward)");
        }
        break;
    }
  } else {
    // Always default mood when not tilted
    if (currentMood != 0) {
      roboEyes.setMood(DEFAULT);
      roboEyes.setCuriosity(OFF);
      currentMood = 0;
      Serial.println("Expression: DEFAULT (stable)");
    }
  }
  
  lastExpressionChange = currentTime;
}

// Function to update eye position based on tilt direction and gyroscope
void updateEyePosition() {
  // Priority 1: Use tilt direction for eye positioning
  if (isTilted && tiltDirection > 0) {
    switch (tiltDirection) {
      case 1: // Tilted LEFT - eyes look left
        roboEyes.setPosition(W);
        break;
      case 2: // Tilted RIGHT - eyes look right
        roboEyes.setPosition(E);
        break;
      case 3: // Tilted FORWARD - eyes look up
        roboEyes.setPosition(N);
        break;
      case 4: // Tilted BACKWARD - eyes look down
        roboEyes.setPosition(S);
        break;
    }
  } 
  // Priority 2: Use gyroscope for fine eye movement when not tilted
  else if (!isTilted) {
    // Use gyroscope data to move eyes for subtle movements
    if (abs(gx) > 8000) { // Threshold to avoid jitter
      if (gx > 0) {
        roboEyes.setPosition(E); // Look right
      } else {
        roboEyes.setPosition(W); // Look left
      }
    } else if (abs(gy) > 8000) {
      if (gy > 0) {
        roboEyes.setPosition(N); // Look up
      } else {
        roboEyes.setPosition(S); // Look down
      }
    } else {
      roboEyes.setPosition(DEFAULT); // Center position
    }
  }
}


void loop() {
  // Read MPU6050 sensor data
  readMPU6050();
  
  // Update eye expressions based on motion
  updateExpressions();
  
  // Update eye position based on gyroscope
  updateEyePosition();
  
  // Update eyes drawings
  roboEyes.update();
  
  delay(20);
}