# Mizuna - AI Companion Pet Robot

> **An intelligent AI companion robot powered by GPT-OSS 20B for personalized daily assistance and home monitoring.**

Meet Mizuna—your chatty little side-kick on wheels. Instead of just running apps or flashing LEDs, Mizuna sits nearby, listens to your everyday conversations through the Omi Friend Device, and figures out how to make your life smoother: jotting down tasks, lining up reminders, and suggesting breaks when you sound stressed. At the same time, its onboard sensors keep a gentle watch over your room, alerting you to motion or changes in temperature so you always feel safe and informed. Everything happens locally on an open-source GPT-OSS 20B brain, so your memories stay yours, and Mizuna’s personality is yours to tweak—from energetic morning motivator to laid-back evening storyteller. In short, it’s not just a robot—it’s the friend who’s always excited to help.

## 🤖 Powered by Groq's GPT-OSS

Mizuna is built using leveraging Groq's [GPT-OSS-20B](https://openai.com/index/introducing-gpt-oss/) model. Developed with feedback from the open-source community, these models push the frontier of open models at their size. 

This project is a creative demonstration of what open models can do—combining real-world robotics, local reasoning, and a fully customizable AI agent. Whether you want a robot that plans your day, a local agent that thrives offline, or a hardware hack that surprises everyone, Mizuna is designed to inspire and empower.

---
## 🚀 Features

- **💾 Persistent Memory** - Remembers your schedule, tasks, and personal events across sessions  
- **🔒 Privacy-First Design** - Open-source LLM ensures full data transparency and control
- **🏠 Home Security Integration** - Motion detection, environmental monitoring, and live surveillance
- **🎭 Customizable Personality** - Adjustable tone, style, and behavioral responses
- **📱 Remote Control** - Manual robot control and real-time home monitoring
- **💰 Cost-Effective** - Affordable alternative to premium personal robots
- **🧠 Intelligent Daily Planning** - Automatically organizes tasks by understanding natural conversations through Omi Friend Device

## 🎯 Target Users

- **Students** - Daily task organization and study planning
- **Remote Workers** - Schedule management and home office monitoring  
- **Tech Enthusiasts** - Customizable open-source AI platform
- **Families** - Home security and personalized assistance
- **Privacy-Conscious Users** - Local AI processing without cloud risks

## 🛠️ Key Problems Solved

| Problem | Solution |
|---------|----------|
| Ineffective daily planning | Automatic task extraction from conversations |
| Generic AI responses | Fully customizable personality and behavior |
| Privacy concerns | Open-source, local processing |
| High robot costs | Affordable hardware with premium AI capabilities |
| Limited home security | Integrated motion detection and surveillance |

# 📚 Mizuna Project Guide

This repository is organized into several key sections. Use the following guides for setup, assembly, and usage:

- [Materials Required](./Materials.md) — Complete bill of materials with images and descriptions.
- [Assembly Instructions](./Assembly.md) — Step-by-step mechanical and wiring guide for building Mizuna.
- [Mizuna App Guide (Mobile)](./Assembly.md) — Features, screens, configuration, and troubleshooting for the Expo/React Native mobile app.
- [Raspberry Pi Robot Guide](./Assembly.md) — Setup, API endpoints, LED/motor behavior, and autostart for the robot code running on the Pi.

---

## Quick Start

1. **Review [Materials.md](./Materials.md)** and gather all required hardware.
2. **Follow [Assembly.md](./Assembly.md)** to build and wire the robot.
3. **Set up the Raspberry Pi** using [Assembly.md](./Assembly.md).
4. **Install and configure the mobile app** using [Assembly.md](./Assembly.md).
5. Power on, connect, and enjoy your new AI companion!
6. Add Omi Friend Integration [Omi](/omi/omi.md) (optional)
---

## 📂 Directory Structure

- `mizuna/` — Python backend and robot control code for Raspberry Pi
- `mizuna-app/` — Expo/React Native mobile app for Mizuna
- `omi` — Omi Friend Integration
- `assets/` — Images of hardware components
- `circuit_diagrams/` — Circuit and wiring diagrams
- `Materials.md` — Hardware bill of materials
- `Assembly.md` — Assembly and wiring instructions

---

## 🤖 Support & Contributions

Pull requests, issues, and feature suggestions are welcome!  
For troubleshooting, see the [robot guide](mizuna/README.md) and [app guide](mizuna-app/README.md).

---
