/**
 * ResQAI Smart Accident Detection Sensor Service
 * Monitors device motion / accelerometer patterns safely and privacy-consciously.
 */

import { SensorSupportStatus } from "../types";

export type ImpactCallback = (details: {
  magnitude: number;
  timestamp: number;
  isSimulated?: boolean;
}) => void;

class AccidentDetectionManager {
  private isListening = false;
  private isEnabled = true;
  private lastTriggerTime = 0;
  private readonly THROTTLE_MS = 20000; // 20s cooldown between impact alerts
  private readonly IMPACT_THRESHOLD = 26.0; // m/s^2 (~2.6G impact spike)
  private readonly JERK_THRESHOLD = 18.0; // rapid delta change
  private lastReading: { x: number; y: number; z: number; magnitude: number; timestamp: number } = {
    x: 0,
    y: 0,
    z: 9.8,
    magnitude: 9.8,
    timestamp: Date.now(),
  };
  private callbacks: Set<ImpactCallback> = new Set();
  private statusListeners: Set<(status: SensorSupportStatus) => void> = new Set();

  private cachedStatus: SensorSupportStatus = {
    supported: false,
    active: false,
    permission: "prompt",
    lastMagnitude: 9.8,
    debugMessage: "Initializing sensor listener...",
  };

  constructor() {
    if (typeof window !== "undefined") {
      this.checkSupport();
    }
  }

  public checkSupport(): SensorSupportStatus {
    if (typeof window === "undefined") {
      return this.cachedStatus;
    }

    const hasDeviceMotion = "DeviceMotionEvent" in window;
    const hasDeviceOrientation = "DeviceOrientationEvent" in window;

    this.cachedStatus = {
      supported: hasDeviceMotion || hasDeviceOrientation,
      active: this.isListening,
      permission: "prompt",
      lastMagnitude: this.lastReading.magnitude,
      debugMessage: hasDeviceMotion
        ? "Device motion sensors detected and available."
        : "Automatic accident detection is not supported on this device.",
    };

    return this.cachedStatus;
  }

  public getStatus(): SensorSupportStatus {
    return { ...this.cachedStatus, active: this.isListening && this.isEnabled };
  }

  public onStatusChange(callback: (status: SensorSupportStatus) => void): () => void {
    this.statusListeners.add(callback);
    callback(this.getStatus());
    return () => this.statusListeners.delete(callback);
  }

  private notifyStatus() {
    const s = this.getStatus();
    this.statusListeners.forEach((cb) => cb(s));
  }

  public onImpactDetected(callback: ImpactCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  public async requestSensorPermission(): Promise<boolean> {
    if (typeof window === "undefined") return false;

    // iOS 13+ requires explicit user gesture permission for DeviceMotionEvent
    if (
      typeof (DeviceMotionEvent as any) !== "undefined" &&
      typeof (DeviceMotionEvent as any).requestPermission === "function"
    ) {
      try {
        const response = await (DeviceMotionEvent as any).requestPermission();
        if (response === "granted") {
          this.cachedStatus.permission = "granted";
          this.notifyStatus();
          return true;
        } else {
          this.cachedStatus.permission = "denied";
          this.cachedStatus.debugMessage = "Device motion permission denied by user.";
          this.notifyStatus();
          return false;
        }
      } catch (err: any) {
        console.warn("Sensor permission request error:", err);
        this.cachedStatus.permission = "denied";
        this.cachedStatus.debugMessage = err.message || "Sensor permission prompt failed.";
        this.notifyStatus();
        return false;
      }
    }

    this.cachedStatus.permission = "granted";
    this.notifyStatus();
    return true;
  }

  public start(enabled: boolean = true) {
    this.isEnabled = enabled;
    if (!enabled) {
      this.stop();
      return;
    }

    if (typeof window === "undefined" || this.isListening) return;

    if ("DeviceMotionEvent" in window) {
      window.addEventListener("devicemotion", this.handleMotion, { passive: true });
      this.isListening = true;
      this.cachedStatus.active = true;
      this.cachedStatus.debugMessage = "Accident detection active. Monitoring motion sensors.";
      this.notifyStatus();
    } else {
      this.cachedStatus.supported = false;
      this.cachedStatus.debugMessage =
        "Automatic accident detection is not supported on this device. Manual SOS remains available.";
      this.notifyStatus();
    }
  }

  public stop() {
    if (typeof window === "undefined" || !this.isListening) return;

    window.removeEventListener("devicemotion", this.handleMotion);
    this.isListening = false;
    this.cachedStatus.active = false;
    this.cachedStatus.debugMessage = "Accident detection paused.";
    this.notifyStatus();
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (enabled) {
      this.start(true);
    } else {
      this.stop();
    }
  }

  private handleMotion = (event: DeviceMotionEvent) => {
    if (!this.isEnabled) return;

    const acc = event.accelerationIncludingGravity || event.acceleration;
    if (!acc) return;

    const x = acc.x || 0;
    const y = acc.y || 0;
    const z = acc.z || 0;

    // Calculate total G-force magnitude: sqrt(x^2 + y^2 + z^2)
    const magnitude = Math.sqrt(x * x + y * y + z * z);
    const now = Date.now();

    // Check jerk: delta between consecutive readings
    const deltaMag = Math.abs(magnitude - this.lastReading.magnitude);

    this.lastReading = { x, y, z, magnitude, timestamp: now };
    this.cachedStatus.lastMagnitude = Math.round(magnitude * 10) / 10;

    // Detection logic: severe impact spike or sudden deceleration jerk
    const isImpactSpike = magnitude >= this.IMPACT_THRESHOLD;
    const isSevereJerk = deltaMag >= this.JERK_THRESHOLD && magnitude >= 20.0;

    if ((isImpactSpike || isSevereJerk) && now - this.lastTriggerTime > this.THROTTLE_MS) {
      this.lastTriggerTime = now;
      this.triggerImpactAlert(magnitude, false);
    }
  };

  /**
   * Safely trigger a simulated accident detection impact for testing and demonstration
   */
  public simulateCrashImpact(magnitude: number = 32.5) {
    const now = Date.now();
    this.lastTriggerTime = now;
    this.triggerImpactAlert(magnitude, true);
  }

  private triggerImpactAlert(magnitude: number, isSimulated: boolean = false) {
    // Dispatch to registered callbacks
    this.callbacks.forEach((cb) => {
      try {
        cb({
          magnitude: Math.round(magnitude * 10) / 10,
          timestamp: Date.now(),
          isSimulated,
        });
      } catch (err) {
        console.error("Error in impact callback:", err);
      }
    });
  }
}

export const accidentDetection = new AccidentDetectionManager();
