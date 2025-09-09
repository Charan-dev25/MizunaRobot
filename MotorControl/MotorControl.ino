#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <ESP8266mDNS.h>
#include <WiFiManager.h>  

// Motor pins (NodeMCU / ESP8266)
const int pwmMotorA = D1;  // Left motor PWM
const int pwmMotorB = D2;  // Right motor PWM
const int dirMotorA = D3;  // Left motor direction (GPIO0 - ensure your driver tolerates boot constraints)
const int dirMotorB = D4;  // Right motor direction (GPIO2)

int motorSpeed = 100; 

ESP8266WebServer server(80);

void stopMotors() {
  analogWrite(pwmMotorA, 0);
  analogWrite(pwmMotorB, 0);
}

void applyMotion(char c) {
  switch (c) {
    case 'F': // Forward
      digitalWrite(dirMotorA, LOW);
      digitalWrite(dirMotorB, LOW);
      analogWrite(pwmMotorA, motorSpeed);
      analogWrite(pwmMotorB, motorSpeed);
      break;
    case 'B': // Backward
      digitalWrite(dirMotorA, HIGH);
      digitalWrite(dirMotorB, HIGH);
      analogWrite(pwmMotorA, motorSpeed);
      analogWrite(pwmMotorB, motorSpeed);
      break;
    case 'L': // Left
      digitalWrite(dirMotorA, HIGH);
      digitalWrite(dirMotorB, LOW);
      analogWrite(pwmMotorA, motorSpeed);
      analogWrite(pwmMotorB, motorSpeed);
      break;
    case 'R': // Right
      digitalWrite(dirMotorA, LOW);
      digitalWrite(dirMotorB, HIGH);
      analogWrite(pwmMotorA, motorSpeed);
      analogWrite(pwmMotorB, motorSpeed);
      break;
    case 'S': // Stop
    default:
      stopMotors();
      break;
  }
}

String htmlPage() {
  String page = R"HTML(
<!doctype html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Mizuna</title>
<style>
  body { font-family: sans-serif; margin: 2rem; }
  .row { margin-bottom: 1rem; }
  button { padding: 1rem 1.5rem; margin: 0.25rem; font-size: 1rem; }
  input[type=range] { width: 300px; }
</style>
</head>
<body>
<h2>Mizuna Companion Robot</h2>
<div class="row">
  <button onclick="cmd('F')">Forward</button>
  <button onclick="cmd('B')">Backward</button>
  <button onclick="cmd('L')">Left</button>
  <button onclick="cmd('R')">Right</button>
  <button onclick="cmd('S')">Stop</button>
</div>
<div class="row">
  <label>Speed: <span id="sv">100</span></label><br/>
  <input id="speed" type="range" min="1" max="1023" value="100" oninput="sv.innerText=this.value" onmouseup="setSpeed(this.value)" ontouchend="setSpeed(this.value)"/>
</div>
<script>
async function cmd(c){ try{ await fetch('/cmd?c='+c); }catch(e){} }
async function setSpeed(v){ try{ await fetch('/speed?v='+v); }catch(e){} }
</script>
</body>
</html>
  )HTML";
  return page;
}

void handleRoot() {
  server.send(200, "text/html", htmlPage());
}

void handleCmd() {
  if (!server.hasArg("c")) {
    server.send(400, "application/json", "{\"ok\":false,\"err\":\"missing c\"}");
    return;
  }
  String c = server.arg("c");
  c.trim(); c.toUpperCase();
  if (c.length() == 0) {
    server.send(400, "application/json", "{\"ok\":false,\"err\":\"empty c\"}");
    return;
  }
  char cmd = c[0];
  applyMotion(cmd);
  server.send(200, "application/json", String("{\"ok\":true,\"cmd\":\"") + cmd + "\"}");
}

void handleSpeed() {
  if (!server.hasArg("v")) {
    server.send(400, "application/json", "{\"ok\":false,\"err\":\"missing v\"}");
    return;
  }
  int v = server.arg("v").toInt();
  if (v < 1 || v > 1023) {
    server.send(400, "application/json", "{\"ok\":false,\"err\":\"speed 1..1023\"}");
    return;
  }
  motorSpeed = v;
  server.send(200, "application/json", String("{\"ok\":true,\"speed\":") + motorSpeed + "}");
}

void handleStatus() {
  String json = String("{\"ok\":true,") +
                "\"speed\":" + motorSpeed + "," +
                "\"rssi\":" + WiFi.RSSI() + "," +
                "\"ip\":\"" + WiFi.localIP().toString() + "\"}";
  server.send(200, "application/json", json);
}

void handleNotFound() {
  server.send(404, "application/json", "{\"ok\":false,\"err\":\"not found\"}");
}

void setup() {
  Serial.begin(115200);

  pinMode(pwmMotorA, OUTPUT);
  pinMode(pwmMotorB, OUTPUT);
  pinMode(dirMotorA, OUTPUT);
  pinMode(dirMotorB, OUTPUT);
  stopMotors();

  WiFi.mode(WIFI_STA);
  WiFiManager wm;
  wm.setConfigPortalTimeout(0);      // no timeout; stay in portal until configured
  wm.setClass("invert");             // optional: dark mode portal
  // AP name appears if station connect fails or no creds are saved
  bool connected = wm.autoConnect("Mizuna");
  if (!connected) {
    // autoConnect starts AP portal automatically until configured; if it returns false here, restart
    Serial.println("WiFi not configured; restarting...");
    delay(2000);
    ESP.restart();
  }

  Serial.print("Connected. IP: ");
  Serial.println(WiFi.localIP());

  if (MDNS.begin("mizuna")) {
    Serial.println("mDNS responder started: http://mizuna.local/");
  }

  server.on("/", HTTP_GET, handleRoot);
  server.on("/cmd", HTTP_GET, handleCmd);
  server.on("/speed", HTTP_GET, handleSpeed);
  server.on("/status", HTTP_GET, handleStatus);
  server.onNotFound(handleNotFound);
  server.begin();
  Serial.println("HTTP server started");
}

void loop() {
  server.handleClient();
  MDNS.update();
}
