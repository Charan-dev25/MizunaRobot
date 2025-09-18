import os
import azure.cognitiveservices.speech as speechsdk
from groq import Groq
from dotenv import load_dotenv
import time
import subprocess
import logging  # Added for logging MongoDB errors
from pymongo import MongoClient  # Added for MongoDB support

# Load environment variables
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
AZURE_SPEECH_KEY = os.getenv("AZURE_SPEECH_KEY")
AZURE_SPEECH_REGION = os.getenv("AZURE_SPEECH_REGION")
AZURE_SPEECH_VOICE = os.getenv("AZURE_SPEECH_VOICE")

# Added MongoDB environment variables (set these in your .env file)
MONGODB_URI = os.getenv("MONGODB_URI")
MONGODB_DB = os.getenv("MONGODB_DB", "mizuna_companion")
MONGODB_COLLECTION = os.getenv("MONGODB_COLLECTION", "mizuna_ai")


LED_COUNT = 64

def show_pixels(colors):
    pixels.fill(colors)

# LED Colors for different states
COLORS = {
    'listening': (0, 100, 255),    # Blue - listening for wake word
    'wake_detected': (255, 165, 0), # Orange - wake word detected
    'conversation': (0, 255, 0),    # Green - conversation mode
    'speaking': (255, 0, 255),      # Magenta - assistant speaking
    'thinking': (255, 255, 0),      # Yellow - processing response
    'off': (0, 0, 0)               # Off
}

def set_led_state(state):
    """Set LED color based on current state (calls led_helper.py as root, non-blocking)"""
    try:
        subprocess.Popen(["sudo", "python3", "led_helper.py", "set", state], start_new_session=True)
    except Exception as e:
        print(f"LED set error: {e}")

def led_pulse(color, duration=1.0, steps=20):
    """Create a pulsing effect with given color (calls led_helper.py as root, non-blocking)"""
    try:
        subprocess.Popen(["sudo", "python3", "led_helper.py", "pulse", str(color[0]), str(color[1]), str(color[2])], start_new_session=True)
    except Exception as e:
        print(f"LED pulse error: {e}")

def generate_groq_response(prompt):
    client = Groq(api_key=GROQ_API_KEY)
    
    # System prompt (unchanged)
    system_content = """You are Mizuna, a friendly robot assistant who enjoys helping humans. Your responses should be:
- Concise and direct (typically 1-3 sentences)
- Conversational and engaging
- Simple but informative
- Free from emojis (as you use text-to-speech)

Always maintain a cheerful, helpful attitude. Ask follow-up questions to better understand the user's needs. When appropriate, offer suggestions rather than just answering questions. Use a warm, approachable tone that makes users feel comfortable chatting with you.

If you don't know something, admit it briefly and offer an alternative way to help instead of lengthy explanations about your limitations.
"""
    
    # Keyword lists for context detection (copied from the Flask app)
    memory_keywords = [
        "remember", "previous", "before", "earlier", "past", "recall", 
        "discussed", "talked about", "mentioned", "conversation", "history",
        "last time", "you said", "we talked", "you told me", "back then",
        "when we", "our chat", "our discussion", "what was", "what did"
    ]
    
    personalized_keywords = [
        "my", "i am", "i'm", "about me", "tell me about myself", 
        "what do you know about", "who am i", "my project", "my work",
        "my idea", "my plan", "my goal", "my robot", "my device",
        "i mentioned", "i told you", "i said", "i was working",
        "remind me", "help me with", "continue with", "follow up"
    ]
    
    knowledge_seeking_keywords = [
        "what is", "who is", "explain", "define", "how does", "why does",
        "tell me about", "what are", "how to", "what's the difference",
        "help me understand", "can you explain", "what was that about",
        "details about", "more information", "elaborate on", "describe"
    ]
    
    project_related_keywords = [
        "project", "build", "building", "robot", "device", "machine",
        "electronic", "funding", "development", "prototype", "design",
        "technology", "engineering", "code", "programming", "software",
        "hardware", "circuit", "component", "sensor", "motor", "battery"
    ]
    
    task_continuation_keywords = [
        "continue", "next step", "what's next", "proceed", "move forward",
        "keep going", "carry on", "follow through", "complete", "finish",
        "resume", "pick up where", "go back to", "return to", "status"
    ]
    
    advice_seeking_keywords = [
        "should i", "what would you", "recommend", "suggest", "advice",
        "opinion", "think about", "feedback", "guidance", "help me decide",
        "best approach", "how would you", "what's your take", "thoughts on"
    ]
    
    problem_solving_keywords = [
        "problem", "issue", "error", "trouble", "stuck", "difficult",
        "challenge", "obstacle", "bug", "fix", "solve", "troubleshoot",
        "not working", "failed", "broken", "wrong", "help"
    ]
    
    comparison_keywords = [
        "better", "worse", "compare", "comparison", "versus", "vs",
        "difference between", "similar to", "like", "unlike", "instead",
        "alternative", "option", "choice", "prefer", "recommend"
    ]
    
    prompt_lower = prompt.lower()
    
    # Determine if context should be loaded
    should_use_context = (
        any(keyword in prompt_lower for keyword in memory_keywords) or
        any(keyword in prompt_lower for keyword in personalized_keywords) or
        (any(keyword in prompt_lower for keyword in knowledge_seeking_keywords) and len(prompt.split()) > 2) or
        any(keyword in prompt_lower for keyword in project_related_keywords) or
        any(keyword in prompt_lower for keyword in task_continuation_keywords) or
        any(keyword in prompt_lower for keyword in advice_seeking_keywords) or
        any(keyword in prompt_lower for keyword in problem_solving_keywords) or
        any(keyword in prompt_lower for keyword in comparison_keywords) or
        (("about" in prompt_lower or "regarding" in prompt_lower) and len(prompt.split()) > 3) or
        (len(prompt.split()) <= 5 and any(word in prompt_lower for word in ["this", "that", "it", "they", "them"]))
    )
    
    messages = [{"role": "system", "content": system_content}]
    
    # Load context from MongoDB if conditions are met
    if should_use_context:
        try:
            mongo_client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
            coll = mongo_client[MONGODB_DB][MONGODB_COLLECTION]
            docs = list(coll.find({}, {"_id": 0, "title": 1, "overview": 1, "content": 1}).sort("local_time", 1).limit(5))
            
            if docs:
                context_parts = []
                for doc in docs:
                    title = doc.get("title", "")
                    overview = doc.get("overview", "")
                    content = doc.get("content", "")
                    
                    if title and overview:
                        memory_entry = f"Previously discussed: {title}. {overview}"
                        if content and len(content) < 300:
                            memory_entry += f" Additional context: {content}"
                        context_parts.append(memory_entry)
                
                if context_parts:
                    memory_context = "Your conversation memory (use only if relevant to the current question):\n" + "\n".join(context_parts)
                    messages.append({"role": "system", "content": memory_context})
        except Exception as e:
            logging.warning(f"MongoDB context loading failed: {e}")
    
    # Add user prompt
    messages.append({"role": "user", "content": prompt})
    
    # Generate response
    chat_completion = client.chat.completions.create(
        messages=messages,
        model="openai/gpt-oss-20b",
        temperature=1,
        top_p=1,
        max_tokens=None
    )
    return chat_completion.choices[0].message.content

def synthesize_voice(text):
    # Set LED to speaking state
    set_led_state('speaking')
    
    speech_config = speechsdk.SpeechConfig(subscription=AZURE_SPEECH_KEY, region=AZURE_SPEECH_REGION)
    speech_config.speech_synthesis_voice_name = AZURE_SPEECH_VOICE
    speech_synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config)
    result = speech_synthesizer.speak_text_async(text).get()

    if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
        print("Voice output completed for text: [{}]".format(text))
    elif result.reason == speechsdk.ResultReason.Canceled:
        cancellation_details = result.cancellation_details
        print("Speech synthesis canceled: {}".format(cancellation_details.reason))

def listen_for_wake_word():
    """Listen for wake words using Azure Speech Recognition"""
    # Set LED to listening state
    set_led_state('listening')
    
    speech_config = speechsdk.SpeechConfig(subscription=AZURE_SPEECH_KEY, region=AZURE_SPEECH_REGION)
    audio_config = speechsdk.audio.AudioConfig(device_name="plughw:2,0")
    speech_recognizer = speechsdk.SpeechRecognizer(speech_config=speech_config, audio_config=audio_config)
    
    wake_words = ["mizuna", "hey mizuna", "computer", "assistant","meezuna" , "mezuna","mizuno","mezuno","meezuno","robot"]
    
    print("Listening for wake words: 'Mizuna', 'Hey Mizuna', 'Computer', or 'Assistant'...")
    
    while True:
        result = speech_recognizer.recognize_once()
        
        if result.reason == speechsdk.ResultReason.RecognizedSpeech:
            recognized_text = result.text.lower().strip()
            print(f"Heard: {recognized_text}")
            
            # Check if any wake word is in the recognized text
            if any(wake_word in recognized_text for wake_word in wake_words):
                print("Wake word detected! Activating conversation mode...")
                
                # Wake word detected - pulse orange
                led_pulse(COLORS['wake_detected'], duration=1.5)
                
                return True
                
        elif result.reason == speechsdk.ResultReason.NoMatch:
            continue
        else:
            print(f"Speech recognition result: {result.reason}")
            continue

def conversation_mode():
    """Handle conversation after wake word is detected"""
    # Set LED to conversation state
    set_led_state('conversation')
    
    speech_config = speechsdk.SpeechConfig(subscription=AZURE_SPEECH_KEY, region=AZURE_SPEECH_REGION)
    audio_config = speechsdk.audio.AudioConfig(device_name="plughw:2,0")
    speech_recognizer = speechsdk.SpeechRecognizer(speech_config=speech_config, audio_config=audio_config)
    
    print("I'm listening! What can I help you with?")
    
    # Listen for 15 seconds for a command (increased timeout)
    timeout = time.time() + 15
    
    while time.time() < timeout:
        result = speech_recognizer.recognize_once()
        
        if result.reason == speechsdk.ResultReason.RecognizedSpeech:
            user_input = result.text.strip()
            print(f"You: {user_input}")
            
            if user_input:
                # Set LED to thinking state while processing
                set_led_state('thinking')
                print("Processing your request...")
                
                # Generate and speak response
                response = generate_groq_response(user_input)
                print(f"Assistant: {response}")
                
                # Speak response (LED will be set to 'speaking' in synthesize_voice)
                synthesize_voice(response)
                
                # Brief pause before returning to wake word detection
                time.sleep(1)
                return
        
        time.sleep(0.1)
    
    print("No command received, returning to wake word detection...")

def main():
    print("Starting Mizuna Assistant...")
    # Initialize LEDs - turn off
    set_led_state('off')
    time.sleep(0.5)

    # Startup sequence - cycle through colors
    print("LED startup sequence...")
    for state in ['listening', 'wake_detected', 'conversation', 'thinking', 'speaking']:
        set_led_state(state)
        time.sleep(0.5)

    set_led_state('off')
    time.sleep(0.5)

    try:
         while True:
             # Listen for wake word
             if listen_for_wake_word():
             # Enter conversation mode
             conversation_mode()

             # Brief pause with LEDs off before returning to wake word detection
             set_led_state('off')
             time.sleep(1)

    except KeyboardInterrupt:
        print("Exiting...")
        set_led_state('off')  # Turn off LEDs when exiting
if name == "main":
   main()
