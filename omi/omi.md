# Omi Friend Device Integration

This document explains how to integrate the Omi Friend Device with the Mizuna AI Companion Robot. [The Omi Friend Device](https://www.omi.me/) is a wearable audio recorder that captures conversations and environmental audio, which Mizuna uses to understand user routines, extract tasks, and provide personalized assistance.

## Overview

The integration works as follows:
- The Omi Friend Device records audio and processes it into structured data (e.g., conversation summaries, key events).
- This data is sent to a Flask server (`app.py`) running on the Raspberry Pi (or another machine).
- The server extracts relevant information (title, overview, content) and stores it in a MongoDB database.
- Mizuna's AI (powered by GPT-OSS) queries this data to remember events, plan days, and respond contextually.

This enables Mizuna to "listen" to your conversations and adapt its behavior, such as reminding you of tasks or suggesting breaks.

## Prerequisites

- **Omi Friend Device:** Ensure you have an Omi Friend Device and the Omi app installed on your phone.
- **Raspberry Pi or Server:** A machine to run the Flask server (e.g., the same Pi running Mizuna).
- **MongoDB:** A MongoDB instance (local or cloud, e.g., MongoDB Atlas) for storing conversation data.
- **Python Environment:** Python 3.7+ with required packages (see `requirements.txt` below).

## Setup Instructions
This can be hosted on any cloud of your choice. Just add your hosted enpoint in developer options in your omi app.

### 1. Install Dependencies

Create a virtual environment and install the required packages:

```bash
git clone https://github.com/cyrixninja/MizunaRobot
cd Mizuna-Companion-Robot/omi
python3 -m venv venv
source venv/bin/activate
pip install flask pymongo python-dotenv
```

### 2. Configure Environment Variables
Create a .env file in the omi/ directory:

MONGODB_URI=mongodb://localhost:27017  # Or your MongoDB Atlas URI
MONGODB_DB=mizuna_companion
MONGODB_COLLECTION=events


### 3 . Run the Flask Server

Start the server and add its endpoint your omi app