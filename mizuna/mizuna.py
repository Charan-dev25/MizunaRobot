import os, io, time, logging, requests, subprocess, re, json
from threading import Condition
from flask import Flask, Response, render_template, request, jsonify
from picamera2 import Picamera2
from picamera2.encoders import JpegEncoder
from picamera2.outputs import FileOutput
from typing import Union
from datetime import datetime

try:
    import psutil  
except Exception:
    psutil = None

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass
try:
    from groq import Groq
except Exception:
    Groq = None
try:
    import azure.cognitiveservices.speech as speechsdk
except Exception:
    speechsdk = None

# ---- Config ----
ROBOT_BASE = os.getenv("ROBOT_BASE", "http://mizuna.local") 
SPEED_DEFAULT = 100
CAM_RES = (640, 480)
PORT = 5000

app = Flask(__name__)
START_TIME = time.time()

# Secrets / config for LLM + TTS
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
AZURE_SPEECH_KEY = os.getenv("AZURE_SPEECH_KEY")
AZURE_SPEECH_REGION = os.getenv("AZURE_SPEECH_REGION")
AZURE_SPEECH_VOICE = os.getenv("AZURE_SPEECH_VOICE", "en-US-JennyNeural")

# ---- Robot HTTP helper ----
def send_robot_cmd(c: str) -> bool:
    try:
        r = requests.get(f"{ROBOT_BASE}/cmd", params={"c": c.strip().upper()}, timeout=2)
        return r.ok
    except Exception as e:
        logging.warning(f"Robot cmd failed: {e}")
        return False

def send_robot_speed(v: Union[int, str]) -> bool:
    try:
        r = requests.get(f"{ROBOT_BASE}/speed", params={"v": str(v)}, timeout=2)
        return r.ok
    except Exception as e:
        logging.warning(f"Robot speed failed: {e}")
        return False

# ---- Camera Streaming Buffer ----
class StreamingOutput(io.BytesIO):
    def __init__(self):
        super().__init__()
        self.frame = None
        self.condition = Condition()
    def write(self, buf):
        with self.condition:
            self.frame = buf
            self.condition.notify_all()

output = StreamingOutput()
picam2 = Picamera2()
config = picam2.create_video_configuration(main={"size": CAM_RES, "format": "XRGB8888"})
picam2.configure(config)
encoder = JpegEncoder()
picam2.start_recording(encoder, FileOutput(output))

def frame_generator():
    while True:
        with output.condition:
            output.condition.wait()
            frame = output.frame
        if frame:
            yield (b'--frame\r\nContent-Type: image/jpeg\r\nContent-Length: ' +
                   str(len(frame)).encode() + b'\r\n\r\n' + frame + b'\r\n')

@app.route("/")
def index():
    return render_template("index.html", SPEED_DEFAULT=SPEED_DEFAULT)

@app.route("/stream.mjpg")
def stream():
    return Response(frame_generator(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route("/cmd", methods=["POST"])
def cmd():
    data = request.get_json(force=True)
    c = data.get("cmd","").strip().upper()
    ok = send_robot_cmd(c)
    return jsonify(status="ok" if ok else "robot_error")

@app.route("/speed", methods=["POST"])
def speed():
    data = request.get_json(force=True)
    v = data.get("speed","100")
    ok = send_robot_speed(v)
    return jsonify(status="ok" if ok else "robot_error")

# ---- Helpers for Stats ----
def _format_duration(seconds: int) -> str:
    h = seconds // 3600
    m = (seconds % 3600) // 60
    s = seconds % 60
    return f"{h:02d}:{m:02d}:{s:02d}"

def _read_cpu_temp() -> Union[float, None]:
    # Prefer sysfs (CPU) then vcgencmd
    try:
        with open("/sys/class/thermal/thermal_zone0/temp", "r") as f:
            t = int(f.read().strip())
            return round(t / 1000.0, 1)
    except Exception:
        pass
    # vcgencmd 
    try:
        out = subprocess.check_output(["vcgencmd", "measure_temp"], text=True)
        m = re.search(r"temp=([\d\.]+)'C", out)
        if m:
            return float(m.group(1))
    except Exception:
        pass
    return None

def _read_gpu_temp() -> Union[float, None]:
    # vcgencmd for GPU temp if available
    try:
        out = subprocess.check_output(["vcgencmd", "measure_temp"], text=True)
        m = re.search(r"temp=([\d\.]+)'C", out)
        if m:
            return float(m.group(1))
    except Exception:
        pass
    # Fallback: if not available, reuse CPU temp
    return _read_cpu_temp()

def _get_system_metrics():
    cpu_percent = None
    disk_percent = None
    mem_percent = None
    if psutil:
        try:
            cpu_percent = psutil.cpu_percent(interval=0.1)
            disk_percent = psutil.disk_usage("/").percent
            mem_percent = psutil.virtual_memory().percent
        except Exception:
            pass
    else:
        # Best-effort CPU approximation using /proc/loadavg
        try:
            with open("/proc/loadavg", "r") as f:
                load1 = float(f.read().split()[0])
            cores = os.cpu_count() or 1
            cpu_percent = min(100.0, max(0.0, (load1 / cores) * 100.0))
        except Exception:
            pass
        # Disk usage via 'df /'
        try:
            out = subprocess.check_output(["df", "/"], text=True).strip().splitlines()
            if len(out) >= 2:
                parts = out[1].split()
                if len(parts) >= 5 and parts[4].endswith('%'):
                    disk_percent = float(parts[4].rstrip('%'))
        except Exception:
            pass
        # Memory via /proc/meminfo
        try:
            meminfo = {}
            with open("/proc/meminfo", "r") as f:
                for line in f:
                    k, v = line.split(':', 1)
                    meminfo[k.strip()] = v.strip()
            total_kb = float(meminfo.get("MemTotal", "0 kB").split()[0])
            avail_kb = float(meminfo.get("MemAvailable", "0 kB").split()[0])
            if total_kb:
                mem_percent = 100.0 * (1.0 - (avail_kb / total_kb))
        except Exception:
            pass
    return {
        "cpu": {"percent": cpu_percent},
        "disk": {"percent": disk_percent},
        "memory": {"percent": mem_percent},
    }

def _check_robot_connectivity():
    t0 = time.time()
    try:
        # Lightweight probe to base URL
        r = requests.get(ROBOT_BASE, timeout=0.7)
        rt_ms = int((time.time() - t0) * 1000)
        status = "online" if r.ok else "offline"
        return {
            "robot_status": status,
            "stats": {"avg_response_time": rt_ms},
            "last_checked": int(time.time()),
        }
    except Exception as e:
        return {
            "robot_status": "offline",
            "stats": {"avg_response_time": None},
            "last_checked": int(time.time()),
        }

# ---- Stats Endpoints ----
@app.route("/temperature", methods=["GET"])
def temperature():
    cpu_t = _read_cpu_temp()
    gpu_t = _read_gpu_temp()
    return jsonify({
        "cpu_temp": cpu_t,
        "gpu_temp": gpu_t,
        "timestamp": int(time.time()),
    })

@app.route("/uptime", methods=["GET"])
def uptime():
    secs = int(time.time() - START_TIME)
    return jsonify({
        "app_uptime": {
            "seconds": secs,
            "formatted": _format_duration(secs),
            "start_time": datetime.fromtimestamp(START_TIME).isoformat(),
        }
    })

@app.route("/performance", methods=["GET"])
def performance():
    robot = _check_robot_connectivity()
    system = _get_system_metrics()
    return jsonify({
        "robot_connectivity": robot,
        "system": system,
    })

# ---- LLM Answer + TTS ----
SYSTEM_PROMPT = """You are Mizuna, a friendly robot assistant. Your responses should be:
- Concise and direct (typically 1-3 sentences)
- Conversational and engaging
- Free from emojis (as you use text-to-speech)

Always maintain a cheerful, helpful attitude. Only reference previous conversations when specifically relevant to the user's question."""

def _generate_groq_response(prompt: str) -> str:
    if Groq is None or not GROQ_API_KEY:
        raise RuntimeError("Groq client not available or GROQ_API_KEY missing")

    # Expanded keywords for context detection
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
    
    # Determine if context should be loaded - more comprehensive detection
    should_use_context = (
        # Direct memory/conversation references
        any(keyword in prompt_lower for keyword in memory_keywords) or
        
        # Personal/user-specific questions
        any(keyword in prompt_lower for keyword in personalized_keywords) or
        
        # Knowledge-seeking questions that might benefit from context
        (any(keyword in prompt_lower for keyword in knowledge_seeking_keywords) and len(prompt.split()) > 2) or
        
        # Project or technical discussions
        any(keyword in prompt_lower for keyword in project_related_keywords) or
        
        # Task continuation requests
        any(keyword in prompt_lower for keyword in task_continuation_keywords) or
        
        # Advice seeking that might relate to past discussions
        any(keyword in prompt_lower for keyword in advice_seeking_keywords) or
        
        # Problem-solving that might reference past issues
        any(keyword in prompt_lower for keyword in problem_solving_keywords) or
        
        # Comparison questions that might relate to past topics
        any(keyword in prompt_lower for keyword in comparison_keywords) or
        
        # Questions about specific topics that might have been discussed
        (("about" in prompt_lower or "regarding" in prompt_lower) and len(prompt.split()) > 3) or
        
        # Follow-up questions (short questions that might need context)
        (len(prompt.split()) <= 5 and any(word in prompt_lower for word in ["this", "that", "it", "they", "them"]))
    )

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    
    # Only add context from MongoDB if conditions are met
    if should_use_context:
        try:
            from pymongo import MongoClient
            import os

            MONGODB_URI = os.getenv("MONGODB_URI")
            DB_NAME = os.getenv("MONGODB_DB", "mizuna_companion")
            COLLECTION_NAME = os.getenv("MONGODB_COLLECTION", "mizuna_ai")

            client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
            coll = client[DB_NAME][COLLECTION_NAME]
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

    # Add the current user prompt
    messages.append({"role": "user", "content": prompt})

    client = Groq(api_key=GROQ_API_KEY)
    chat_completion = client.chat.completions.create(
        messages=messages,
        model="openai/gpt-oss-20b",
        temperature=0.3,
        top_p=0.9,
        max_tokens=200,
    )
    return chat_completion.choices[0].message.content

def _speak_text_async(text: str) -> bool:
    if speechsdk is None or not (AZURE_SPEECH_KEY and AZURE_SPEECH_REGION):
        return False
    try:
        import threading

        def _runner():
            try:
                speech_config = speechsdk.SpeechConfig(
                    subscription=AZURE_SPEECH_KEY, region=AZURE_SPEECH_REGION
                )
                speech_config.speech_synthesis_voice_name = AZURE_SPEECH_VOICE
                synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config)
                res = synthesizer.speak_text_async(text).get()
                if res.reason == speechsdk.ResultReason.Canceled:
                    logging.warning("TTS canceled: %s", getattr(res, "cancellation_details", None))
            except Exception as e:
                logging.exception("TTS error: %s", e)

        threading.Thread(target=_runner, daemon=True).start()
        return True
    except Exception as e:
        logging.exception("Failed starting TTS thread: %s", e)
        return False

@app.route("/ask", methods=["POST"])
def ask():
    # Accept JSON, form, query, or raw body for robustness
    prompt = ""
    data = None
    try:
        data = request.get_json(silent=True)
    except Exception:
        data = None
    if isinstance(data, dict):
        prompt = (data.get("text") or data.get("question") or "").strip()
    if not prompt:
        prompt = (request.form.get("text") or request.form.get("question") or "").strip()
    if not prompt:
        prompt = (request.args.get("text") or request.args.get("question") or "").strip()
    if not prompt:
        try:
            raw = request.get_data(cache=False, as_text=True)
            if raw:
                obj = json.loads(raw)
                if isinstance(obj, dict):
                    prompt = (obj.get("text") or obj.get("question") or "").strip()
        except Exception:
            pass
    if not prompt:
        logging.info("/ask received empty prompt. Headers=%s", dict(request.headers))
        return jsonify(error="Missing 'text' or 'question' in request"), 400
    try:
        reply = _generate_groq_response(prompt)
    except Exception as e:
        logging.exception("LLM error: %s", e)
        return jsonify(error="LLM_unavailable", detail=str(e)), 500

    spoken = _speak_text_async(reply)
    return jsonify(status="ok", reply=reply, voice={"spoken": bool(spoken)})

@app.route("/clear_context", methods=["POST"])
def clear_context():
    """
    Deletes all documents from the MongoDB context collection.
    """
    try:
        from pymongo import MongoClient
        MONGODB_URI = os.getenv("MONGODB_URI")
        DB_NAME = os.getenv("MONGODB_DB", "mizuna_companion")
        COLLECTION_NAME = os.getenv("MONGODB_COLLECTION", "mizuna_ai")

        client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
        coll = client[DB_NAME][COLLECTION_NAME]
        result = coll.delete_many({})
        return jsonify(status="ok", deleted_count=result.deleted_count)
    except Exception as e:
        logging.exception("Failed to clear context: %s", e)
        return jsonify(status="error", detail=str(e)), 500

# ---- Start ----
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    try:
        app.run(host="0.0.0.0", port=PORT, threaded=True)
    finally:
        try:
            picam2.stop_recording()
            picam2.close()
        except:
            pass
