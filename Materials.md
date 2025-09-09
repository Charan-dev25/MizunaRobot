# Mizuna Robot – Materials Required

This document lists all the hardware components needed to assemble the Mizuna AI Companion Robot. Each item is illustrated in the `assets` folder.

---

## Core Components

| Component                | Image                                      | Description / Purpose                                   |
|--------------------------|--------------------------------------------|---------------------------------------------------------|
| **NodeMCU x2**           | ![NodeMCU](assets/nodemcu.png)             | Microcontroller for motor/sensor control and comms      |
| **NodeMCU Motor Shield** | ![Motor Shield](assets/motor_shield.png)   | Drives motors via NodeMCU                               |
| **Raspberry Pi 3/4/5**   | ![Raspberry Pi](assets/raspberry_pi.png)   | Main computer for AI, camera, and app server            |
| **Raspberry Pi Camera**  | ![Camera](assets/camera.png)               | Provides live video streaming and vision                |
| **Bluetooth/Custom Speaker** | ![Speaker](assets/speaker.png)         | Outputs synthesized speech and audio feedback           |
| **BO Motors + Wheels x4**| ![Motor & Wheel](assets/motor_wheel.png)   | Enable movement and navigation                          |
| **OLED Screen 1.3 inch** | ![OLED](assets/oled.png)                   | Shows status, face, or debug info (optional)            |
| **MPU 6050**             | ![MPU6050](assets/mpu6050.png)             | Orientation and motion sensor (optional)                |
| **12V Battery Pack**     | ![Battery](assets/battery.png)             | Main power source for robot and peripherals             |
| **Power Supply Module**  | ![Power Supply](assets/power_supply.png)   | Regulates voltage for Pi, motors, and LEDs              |
| **Micro USB Mic**        | ![Mic](assets/mic.png)                     | Captures voice commands                                 |
| **LED Matrix**           | ![LED Matrix](assets/led_matrix.png)        | Expressive RGB feedback and animations                  |
| **Breadboard**           | ![Breadboard](assets/breadboard.png)        | Prototyping and connecting components                   |
| **Jumper Wires**         | ![Jumper Wires](assets/jumper_wires.png)    | For making electrical connections between modules       |

---

## Additional Notes

- **Wiring:** Use quality jumper wires and ensure all grounds are connected.
- **Power:** Use a high-current 5V supply for the Pi and LEDs. Motors may require a separate supply.
- **Sensors:** You can expand with more sensors (PIR, temperature, etc.) as needed.
- **Enclosure:** 3D-printed or custom chassis recommended for protection and aesthetics.

---

## Visual Reference

All images are available in the [`assets`](assets) directory for documentation or presentation use.