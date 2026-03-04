import {
  Lightbulb, Shield, Droplets, Zap, CircuitBoard, Thermometer,
  Camera, Lock, Waves, Power, Wifi, Radio, Bluetooth, Server
} from "lucide-react";

export type ProtocolType = "mqtt" | "zigbee" | "wifi" | "ble";
export type ModuleId = "energy_meters" | "smart_lighting" | "security_cameras" | "water_irrigation" | "circuit_breakers" | "climate_control";

export interface IoTModule {
  id: ModuleId;
  name: string;
  description: string;
  icon: any;
  color: string;        // Tailwind text color class using semantic tokens
  bgColor: string;       // Tailwind bg class
  protocols: ProtocolType[];
  isCore: boolean;       // Core modules can't be disabled
  features: string[];
}

export const protocolInfo: Record<ProtocolType, { name: string; icon: any; color: string }> = {
  mqtt: { name: "MQTT", icon: Server, color: "text-primary" },
  zigbee: { name: "Zigbee", icon: Radio, color: "text-accent" },
  wifi: { name: "WiFi", icon: Wifi, color: "text-success" },
  ble: { name: "BLE", icon: Bluetooth, color: "text-[hsl(var(--purple))]" },
};

export const iotModules: IoTModule[] = [
  {
    id: "energy_meters",
    name: "Energy Meters",
    description: "Smart energy metering, wallet recharges & kWh tracking",
    icon: Zap,
    color: "text-primary",
    bgColor: "bg-primary/10",
    protocols: ["mqtt", "wifi"],
    isCore: true,
    features: ["Real-time consumption", "Wallet management", "Relay control", "Usage analytics"],
  },
  {
    id: "smart_lighting",
    name: "Smart Lighting",
    description: "Control bulbs, strips, scenes & schedules",
    icon: Lightbulb,
    color: "text-accent",
    bgColor: "bg-accent/10",
    protocols: ["zigbee", "wifi", "ble"],
    isCore: false,
    features: ["Color control", "Brightness dimming", "Scene presets", "Schedules & timers"],
  },
  {
    id: "security_cameras",
    name: "Security & Access",
    description: "Cameras, door locks, motion sensors & alerts",
    icon: Camera,
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    protocols: ["wifi", "ble", "zigbee"],
    isCore: false,
    features: ["Live camera feeds", "Motion detection", "Smart locks", "Alert notifications"],
  },
  {
    id: "water_irrigation",
    name: "Water & Irrigation",
    description: "Flow sensors, tank levels & automated watering",
    icon: Droplets,
    color: "text-[hsl(var(--cyan))]",
    bgColor: "bg-[hsl(var(--cyan))]/10",
    protocols: ["mqtt", "wifi"],
    isCore: false,
    features: ["Flow monitoring", "Tank level alerts", "Irrigation schedules", "Leak detection"],
  },
  {
    id: "circuit_breakers",
    name: "Smart Circuit Breakers",
    description: "Remote circuit control, overload protection & monitoring",
    icon: CircuitBoard,
    color: "text-[hsl(var(--purple))]",
    bgColor: "bg-[hsl(var(--purple))]/10",
    protocols: ["mqtt", "wifi"],
    isCore: false,
    features: ["Remote on/off", "Overload protection", "Power monitoring", "Trip alerts"],
  },
  {
    id: "climate_control",
    name: "Climate & HVAC",
    description: "Thermostats, AC units, fans & humidity sensors",
    icon: Thermometer,
    color: "text-success",
    bgColor: "bg-success/10",
    protocols: ["zigbee", "wifi", "ble"],
    isCore: false,
    features: ["Temperature control", "Humidity monitoring", "Fan speed", "Smart schedules"],
  },
];

export function getModule(id: ModuleId): IoTModule | undefined {
  return iotModules.find(m => m.id === id);
}
