# How to Assemble Mizuna — Step‑by‑Step Guide

This document provides concise, actionable assembly, wiring, and first‑run instructions for the Mizuna Robot.


## [Required tools & parts](/Materials.md)


## Assembly
1.Clear a well‑lit, flat workbench. Gather tools: small screwdrivers, pliers, wire stripper, soldering iron (optional), multimeter, zip ties, double‑sided tape.

2.Verify parts list from Materials.md and inspect connectors, screws, and cables.

3.Label motors, motor wires, and any controller headers with tape to avoid confusion.

4. Mark motor mounting positions on the chassis ensuring wheels clear the ground and chassis.

5. Drill or cut mounting holes for motor brackets. Deburr holes to avoid wire abrasion.

6. Fasten motor brackets securely; use lock washers or threadlocker if available.

7. Mount motors into brackets and torque screws snugly (do not over‑tighten).

8. Attach wheels to motor shafts and confirm free rotation with the robot raised off the ground.

9. Mount the motor shield on the chassis near the motors to keep motor power wires short.

10. Mount NodeMCU(s) on or adjacent to the motor shield per the shield's mounting pattern.
![Motor Shield](/circuit_diagrams/motor_shield.png)

11. Attach the Motors to the Motor Shield and Battery to Motor Shield as follows
![Motor](/circuit_diagrams/motor.jpeg)

11. Install camera at front face; align lens with face opening and do the following wiring with the raspberry pi
![Raspberry Pi](/circuit_diagrams/raspberry_pi.png)

12. Attach LED strips/matrix and OLED where visible on the box or chasis.

13. Secure battery pack and converters; use straps or a mounting tray.

14. Follow the following circuit diagram and make connections for the face
 ![Face](/circuit_diagrams/face.png)

15. Manage cables with zip ties; leave slack on moving joints.


---

## Software & initial checks (Pi)
1. Flash Raspberry Pi OS to SD card.
2. Enable interfaces: `sudo raspi-config` → enable Camera, I2C, SSH (optional).
3. Update system:
   - sudo apt update && sudo apt upgrade -y
4. Install Python and essentials:
   - sudo apt install -y python3 python3-venv python3-pip i2c-tools libatlas-base-dev
5. Test I2C:
   - sudo i2cdetect -y 1
6. Test camera:
   - sudo apt install -y libcamera-apps
   - libcamera-hello
7. Clone repository and install Python deps:
   - git clone https://github.com/cyrixninja/MizunaRobot
   - cd mizuna
   - python3 -m venv venv
   - source venv/bin/activate
   - pip install -r requirements.txt
8. Setup the Enviroment Variables
   - Setup Azure Speech Service
   - Setup Groq API Key
   - Setup MongoDB Database
```
GROQ_API_KEY=<your-groq-api-key-here>
AZURE_SPEECH_KEY=<your-azure-speech-key-here>
AZURE_SPEECH_REGION=<your-azure-speech-region-here>
AZURE_SPEECH_VOICE=en-US-AshleyNeural
MONGODB_URI= <your-mongodb-connection-string-here>
MONGODB_DB=mizuna_companion
```
9. Run service 1:
   - python mizuna.py
   - Verify stream at: http://raspberrypi.local:5000/stream.mjpg
10. Run service 2:
   - python app.py
11. Upload the Motor Control Code
   - Upload the  /fave/RobotFace.ino to NodeMCU connected to the OLED Screen
12. Upload the Face ControlCode
   - Upload the  /MotorControl/MotorControl.ino to NodeMCU connected to the Motor Shield
13. Power on all the nodemcu and Raspberry Pi by connecting them to power supply
14. You can access the mizuna using the app or talk to it directly
15. You can also integrate omi friend device if you want mizuna to access your daily memories by following [Omi](/omi/omi.md) instructions (optional)