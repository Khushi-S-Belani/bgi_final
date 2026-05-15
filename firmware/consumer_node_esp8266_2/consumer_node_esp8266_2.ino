#include <Arduino.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>

// ========================= HARDWARE PINS =========================
#define RELAY_PIN 0            // D3 (GPIO 0)
#define EMERGENCY_BUTTON_PIN 13 // D7 (GPIO 13)
#define FLOW_SENSOR_PIN 12      // D6 (GPIO 12)
#define EMERGENCY_LED_PIN 14    // D5 (GPIO 14)

// ========================= CONSTANTS & GLOBALS =========================
const float FLOW_CALIBRATION_FACTOR = 7.5; 
volatile unsigned long pulseCount = 0;
float flowRate = 0.0;
float currentTotalLitres = 0.0;
unsigned long oldTime = 0;

float emergencyLimit = 5.0; 
bool emergencyMode = false;
bool valveOpen = false;
bool tamperAlert = false;

Adafruit_MPU6050 mpu;
StaticJsonDocument<256> doc;

void IRAM_ATTR pulseCounter() {
  pulseCount++;
}

void setup() {
  Serial.begin(115200);
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(EMERGENCY_LED_PIN, OUTPUT);
  pinMode(EMERGENCY_BUTTON_PIN, INPUT_PULLUP);
  pinMode(FLOW_SENSOR_PIN, INPUT_PULLUP);
  digitalWrite(RELAY_PIN, HIGH);
  digitalWrite(EMERGENCY_LED_PIN, LOW);
  attachInterrupt(digitalPinToInterrupt(FLOW_SENSOR_PIN), pulseCounter, FALLING);

  Wire.begin(4, 5); 
  if (!mpu.begin()) {}
  mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
}

void loop() {
  if ((millis() - oldTime) > 1000) {
    detachInterrupt(digitalPinToInterrupt(FLOW_SENSOR_PIN));
    flowRate = ((1000.0 / (millis() - oldTime)) * pulseCount) / FLOW_CALIBRATION_FACTOR;
    oldTime = millis();
    currentTotalLitres += (flowRate / 60);
    pulseCount = 0;
    attachInterrupt(digitalPinToInterrupt(FLOW_SENSOR_PIN), pulseCounter, FALLING);
  }

  if (digitalRead(EMERGENCY_BUTTON_PIN) == LOW && !emergencyMode) {
    emergencyMode = true;
    valveOpen = true;
    currentTotalLitres = 0; 
    digitalWrite(EMERGENCY_LED_PIN, HIGH);
  }

  if (emergencyMode && currentTotalLitres >= emergencyLimit) {
    emergencyMode = false;
    valveOpen = false;
    digitalWrite(EMERGENCY_LED_PIN, LOW);
  }

  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);
  if (abs(a.acceleration.x) > 15 || abs(a.acceleration.y) > 15 || abs(a.acceleration.z) > 15) {
    tamperAlert = true;
  }

  digitalWrite(RELAY_PIN, valveOpen ? LOW : HIGH);

  doc.clear();
  doc["id"] = "CONSUMER_2"; // ID set to CONSUMER_2
  doc["flow"] = flowRate;
  doc["total"] = currentTotalLitres;
  doc["valve"] = valveOpen;
  doc["emergency"] = emergencyMode;
  doc["tamper"] = tamperAlert;
  
  serializeJson(doc, Serial);
  Serial.println();

  if (Serial.available() > 0) {
    String input = Serial.readStringUntil('\n');
    StaticJsonDocument<128> inputDoc;
    deserializeJson(inputDoc, input);
    if (inputDoc.containsKey("valve")) valveOpen = inputDoc["valve"];
    if (inputDoc.containsKey("limit")) emergencyLimit = inputDoc["limit"];
    if (inputDoc.containsKey("resetTamper")) tamperAlert = false;
  }
  delay(100);
}
