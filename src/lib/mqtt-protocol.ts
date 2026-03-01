/**
 * COMPERE MQTT Communication Protocol V1.9
 * Types and interfaces for meter data exchange
 */

// ============================================================================
// Real-Time Data (Second Level)
// ============================================================================

export interface MqttRealTimeSecondLevelData {
  id: string; // Meter ID
  ua?: number; // Phase A voltage (V)
  ub?: number; // Phase B voltage (V)
  uc?: number; // Phase C voltage (V)
  ia?: number; // Phase A current (A)
  ib?: number; // Phase B current (A)
  ic?: number; // Phase C current (A)
  uab?: number; // Line voltage AB (V)
  ubc?: number; // Line voltage BC (V)
  uca?: number; // Line voltage CA (V)
  pa?: number; // Phase A active power (kW)
  pb?: number; // Phase B active power (kW)
  pc?: number; // Phase C active power (kW)
  zyggl?: number; // Total active power (P) (kW)
  qa?: number; // Phase A reactive power (kvar)
  qb?: number; // Phase B reactive power (kvar)
  qc?: number; // Phase C reactive power (kvar)
  zwggl?: number; // Total reactive power (Q) (kvar)
  sa?: number; // Phase A apparent power (kVA)
  sb?: number; // Phase B apparent power (kVA)
  sc?: number; // Phase C apparent power (kVA)
  zszgl?: number; // Total apparent power (S) (kVA)
  pfa?: number; // Phase A power factor
  pfb?: number; // Phase B power factor
  pfc?: number; // Phase C power factor
  zglys?: number; // Total power factor
  f?: number; // System frequency (Hz)
  U0?: number; // Zero sequence voltage (V)
  "U+"?: number; // Positive sequence voltage (V)
  "U-"?: number; // Negative sequence voltage (V)
  I0?: number; // Zero sequence current (A)
  "I+"?: number; // Positive sequence current (A)
  "I-"?: number; // Negative sequence current (A)
  UXJA?: number; // UA phase angle (°)
  UXJB?: number; // UB phase angle (°)
  UXJC?: number; // UC phase angle (°)
  IXJA?: number; // IA phase angle (°)
  IXJB?: number; // IB phase angle (°)
  IXJC?: number; // IC phase angle (°)
  unb?: number; // Three-phase voltage unbalance rate
  inb?: number; // Three-phase current unbalance rate
  pdm?: number; // Total active power demand (kW)
  qdm?: number; // Total reactive power demand (kvar)
  sdm?: number; // Total apparent power demand (kVA)
  ig?: number; // Residual current (A)
  ta?: number; // Phase A temperature (°C)
  tb?: number; // Phase B temperature (°C)
  tc?: number; // Phase C temperature (°C)
  tn?: number; // Neutral phase temperature (°C)
  time: string; // Time tag (yyyyMMddHHmmss)
  isend: "0" | "1"; // 0 = more packets, 1 = last packet
}

// ============================================================================
// Real-Time Data (Minute Level)
// ============================================================================

export interface MqttRealTimeMinuteLevelData {
  id: string; // Meter ID
  // Total energy
  zygsz?: number; // Import total active energy (kWh)
  fygsz?: number; // Export total active energy (kWh)
  zwgsz?: number; // Import total reactive energy (kvarh)
  fwgsz?: number; // Export total reactive energy (kvarh)
  // Tariff 1
  zyjsz?: number; // Import active tariff 1 energy (kWh)
  fyjsz?: number; // Export active tariff 1 energy (kWh)
  // Tariff 2
  zyfsz?: number; // Import active tariff 2 energy (kWh)
  fyfsz?: number; // Export active tariff 2 energy (kWh)
  // Tariff 3
  zypsz?: number; // Import active tariff 3 energy (kWh)
  fypsz?: number; // Export active tariff 3 energy (kWh)
  // Tariff 4
  zyvsz?: number; // Import active tariff 4 energy (kWh)
  fyvsz?: number; // Export active tariff 4 energy (kWh)
  // Tariff 5
  zydvsz?: number; // Import active tariff 5 energy (kWh)
  fydvsz?: number; // Export active tariff 5 energy (kWh)
  // Tariff 6
  zy6sz?: number; // Import active tariff 6 energy (kWh)
  fy6sz?: number; // Export active tariff 6 energy (kWh)
  // Power demand
  dmpmax?: number; // Monthly max active power demand (kW)
  dmpmaxoct?: number; // UTC timestamp of max active power
  dmsmax?: number; // Monthly max apparent power demand (kVA)
  // Harmonics
  uathd?: number; // THD ua
  ubthd?: number; // THD ub
  ucthd?: number; // THD uc
  iathd?: number; // THD ia
  ibthd?: number; // THD ib
  icthd?: number; // THD ic
  // 3rd harmonics
  uaxbl3?: number; // Ua 3rd harmonic content rate
  ubxbl3?: number; // Ub 3rd harmonic content rate
  ucxbl3?: number; // Uc 3rd harmonic content rate
  iaxbl3?: number; // Ia 3rd harmonic content rate
  ibxbl3?: number; // Ib 3rd harmonic content rate
  icxbl3?: number; // Ic 3rd harmonic content rate
  // 5th harmonics
  uaxbl5?: number; // Ua 5th harmonic content rate
  ubxbl5?: number; // Ub 5th harmonic content rate
  ucxbl5?: number; // Uc 5th harmonic content rate
  iaxbl5?: number; // Ia 5th harmonic content rate
  ibxbl5?: number; // Ib 5th harmonic content rate
  icxbl5?: number; // Ic 5th harmonic content rate
  // 7th harmonics
  uaxbl7?: number; // Ua 7th harmonic content rate
  ubxbl7?: number; // Ub 7th harmonic content rate
  ucxbl7?: number; // Uc 7th harmonic content rate
  iaxbl7?: number; // Ia 7th harmonic content rate
  ibxbl7?: number; // Ib 7th harmonic content rate
  icxbl7?: number; // Ic 7th harmonic content rate
  // Current harmonics
  iaxb3?: number; // Ia 3rd current harmonic content
  ibxb3?: number; // Ib 3rd current harmonic content
  icxb3?: number; // Ic 3rd current harmonic content
  iaxb5?: number; // Ia 5th current harmonic content
  ibxb5?: number; // Ib 5th current harmonic content
  icxb5?: number; // Ic 5th current harmonic content
  iaxb7?: number; // Ia 7th current harmonic content
  ibxb7?: number; // Ib 7th current harmonic content
  icxb7?: number; // Ic 7th current harmonic content
  time: string; // Time tag (yyyyMMddHHmmss)
  isend: "0" | "1"; // 0 = more packets, 1 = last packet
}

// ============================================================================
// Daily Data
// ============================================================================

export interface MqttDailyData {
  id: string; // Meter ID
  zygdd?: number; // Import total active energy at 0:00 (kWh)
  fygdd?: number; // Export total active energy at 0:00 (kWh)
  zwgdd?: number; // Import total reactive energy at 0:00 (kvarh)
  fwgdd?: number; // Export total reactive energy at 0:00 (kvarh)
  // Tariffs
  zyjsz?: number; // Tariff 1 import active at 0:00 (kWh)
  fyjsz?: number; // Tariff 1 export active at 0:00 (kWh)
  zyfsz?: number; // Tariff 2 import active at 0:00 (kWh)
  fyfsz?: number; // Tariff 2 export active at 0:00 (kWh)
  zypsz?: number; // Tariff 3 import active at 0:00 (kWh)
  fypsz?: number; // Tariff 3 export active at 0:00 (kWh)
  zyvsz?: number; // Tariff 4 import active at 0:00 (kWh)
  fyvsz?: number; // Tariff 4 export active at 0:00 (kWh)
  time: string; // Time tag (yyyyMMddHHmmss)
  isend: "0" | "1"; // 0 = more packets, 1 = last packet
}

// ============================================================================
// Remote Signal Data (Digital Inputs/Outputs)
// ============================================================================

export interface MqttRemoteSignalData {
  id: string; // Meter ID
  value: string; // Format: DI@DO (e.g., "00000003@00000003")
  time: string; // Time tag (yyyyMMddHHmmss)
}

// ============================================================================
// Remote Control Data
// ============================================================================

export interface MqttRemoteControlRequest {
  dox: "0" | "1"; // 1 = on, 0 = off (x can be 1-32)
  oprid: string; // Operation ID (32 bit string)
}

export interface MqttRemoteControlResponse {
  id: string; // Meter ID
  dox: "0" | "1"; // 1 = on, 0 = off
  oprid: string; // Operation ID
  code: "01" | "02"; // 01 = succeeded, 02 = failed
  msg?: string; // Failure reason
}

// ============================================================================
// Data Recall
// ============================================================================

export interface MqttDataRecallRequest {
  date: string; // Format: yyyyMM or yyyyMMdd
  oprid: string; // Operation ID (32 bit string)
  oprtype: "2"; // 2 = monthly data recall
}

export interface MqttDataRecallResponse {
  id: string; // Meter ID
  oprid: string; // Operation ID
  code: "01" | "02"; // 01 = succeeded, 02 = failed
  msg?: string; // Failure reason
  frz_type: "2"; // Frozen type (2 = monthly)
  time: string; // yyyyMM or yyyyMMdd
  zygdd?: number; // Import total active energy (kWh)
  fygdd?: number; // Export total active energy (kWh)
  zwgdd?: number; // Import total reactive energy (kvarh)
  fwgdd?: number; // Export total reactive energy (kvarh)
  zyjdd?: number; // Import active tariff 1 energy (kWh)
  fyjdd?: number; // Export active tariff 1 energy (kWh)
  zyfdd?: number; // Import active tariff 2 energy (kWh)
  fyfdd?: number; // Export active tariff 2 energy (kWh)
  zypdd?: number; // Import active tariff 3 energy (kWh)
  fypdd?: number; // Export active tariff 3 energy (kWh)
  zyvdd?: number; // Import active tariff 4 energy (kWh)
  fyvdd?: number; // Export active tariff 4 energy (kWh)
  isend: "0" | "1";
}

// ============================================================================
// Time Synchronization
// ============================================================================

export interface MqttTimeSyncRequest {
  oprid: string; // Operation ID (32 bit string)
  time: string; // Format: yyyyMMddHHmmss
}

export interface MqttTimeSyncResponse {
  id: string; // Meter ID
  oprid: string; // Operation ID
  code: "01" | "02"; // 01 = succeeded, 02 = failed
  msg?: string; // Failure reason
}

// ============================================================================
// Parameter Setting
// ============================================================================

export interface MqttParameterSetRequest {
  oprid: string; // Operation ID (32 bit string)
  addr: string; // Modbus register address (hex)
  value: string; // Value to write (can be multiple values separated by ;)
  type: "1" | "2"; // 1 = integer, 2 = float
}

export interface MqttParameterSetResponse {
  id: string; // Meter ID
  oprid: string; // Operation ID
  code: "01" | "02"; // 01 = succeeded, 02 = failed
}

export interface MqttParameterReadRequest {
  oprid: string; // Operation ID (32 bit string)
  addr: string; // Modbus register address (hex)
  lenth: string; // Length of read parameter
  type: "1" | "2"; // 1 = integer, 2 = float
}

export interface MqttParameterReadResponse {
  id: string; // Meter ID
  oprid: string; // Operation ID
  addr: string; // Modbus register address
  lenth: string; // Length read
  value: string; // Read value
  type: "1" | "2"; // Data type
}

// ============================================================================
// MQTT Configuration
// ============================================================================

export interface MqttConfigReconfigRequest {
  oprid: string; // Operation ID (32 bit string)
}

export interface MqttConfigReconfigResponse {
  id: string; // Meter ID
  oprid: string; // Operation ID
  code: "01" | "02"; // 01 = succeeded, 02 = failed
  msg?: string; // Failure reason
}

export interface MqttUploadFrequencySetRequest {
  oprid: string; // Operation ID
  Cmd: "0000" | "0001"; // 0000 = second-level, 0001 = minute-level
  value: string; // Frequency value
  types: "1" | "2"; // 1 = integer, 2 = float
}

export interface MqttUploadFrequencySetResponse {
  id: string; // Meter ID
  oprid: string; // Operation ID
  code: "01" | "02"; // 01 = success, 02 = fail
}

export interface MqttUploadFrequencyReadRequest {
  oprid: string; // Operation ID
  Cmd: "0000" | "0001"; // 0000 = second-level, 0001 = minute-level
  types: "1" | "2"; // 1 = integer, 2 = float
}

export interface MqttUploadFrequencyReadResponse {
  id: string; // Meter ID
  oprid: string; // Operation ID
  Cmd: "0000" | "0001";
  value: string; // Frequency value
  code: "01" | "02"; // 01 = success, 02 = fail
}

// ============================================================================
// Maintenance Platform
// ============================================================================

export interface MqttMeterRequestConfig {
  code: string; // Meter ID
}

export interface MqttMeterConfigResponse {
  code: string; // Meter ID
  status: "ok" | "fail";
}

export interface MqttWifiConfiguration {
  info: string; // Format: ip_addr;port;mqtt_account;mqtt_password;WIFI_account;WIFI_password[;WPA2_method;WIFI_username2;WIFI_password2]
}

export interface MqttLteConfiguration {
  info: string; // Format: ip_addr;port;mqtt_account;mqtt_password
}

// ============================================================================
// Meter Code Rules
// ============================================================================

export interface MeterCode {
  deviceId: string; // 13-bit MQTT packet format
  productionNumber: string; // 0001-9999
  meterModelCode: MeterModel;
  productionMonth: string; // 1-C (hex)
  productionYear: string; // 00-99
  communicationType: CommunicationType;
}

export enum MeterModel {
  KPM37 = "0",
  KPM31A = "1",
  KPM31B = "2",
  KPM31C = "3",
  KPM33A = "4",
  KPM33B = "5",
  PUMG598 = "6",
  KPM75 = "7",
  KPM73 = "8",
  KPM53 = "9",
  KPM10 = "A",
  KPM51 = "B",
  KPM312 = "C",
  KPM60 = "D",
  KPM60S = "E",
  KPMG60 = "F",
  KPM60R = "G",
  KPM33D = "H",
}

export enum CommunicationType {
  RS485 = "0",
  LTE_4G = "1",
  WIFI = "2",
  LORA = "3",
  PROFIBUS_DP = "4",
}

// ============================================================================
// MQTT Topic Names (from COMPERE spec)
// ============================================================================

export const MQTT_TOPICS = {
  REAL_TIME_DATA: "MQTT_RT_DATA", // Second-level real-time data
  ENERGY_NOW: "MQTT_ENY_NOW", // Minute-level real-time energy data
  DAILY_DATA: "MQTT_DAY_DATA", // Daily data
  REMOTE_SIGNAL: "MQTT_TELEIND", // Remote signal data (DI/DO)
  REMOTE_CONTROL: (meterId: string) => `MQTT_TELECTRL_${meterId.slice(-8)}`, // Remote control
  REMOTE_CONTROL_REPLY: "MQTT_TELECTRL_REP", // Remote control response
  DATA_RECALL: (meterId: string) => `MQTT_RECALL_${meterId.slice(-8)}`, // Data recall request
  DATA_RECALL_REPLY: "MQTT_RECALL_REP", // Data recall response
  TIME_SYNC: (meterId: string) => `MQTT_SETTIME_${meterId.slice(-8)}`, // Time sync
  TIME_SYNC_REPLY: "MQTT_METER_TIME_REP", // Time sync response
  PARAMETER_SET: (meterId: string) => `MQTT_SYS_CFG_${meterId.slice(-8)}`, // Parameter setting
  PARAMETER_SET_REPLY: "MQTT_SYS_SET_REP", // Parameter set response
  PARAMETER_READ: (meterId: string) => `MQTT_SYS_READ_${meterId.slice(-8)}`, // Parameter read
  PARAMETER_READ_REPLY: "MQTT_SYS_REPLY", // Parameter read response
  CONFIG_RECONFIG: (meterId: string) => `MQTT_RECONFIG_${meterId.slice(-8)}`, // MQTT reconfig
  CONFIG_RECONFIG_REPLY: "MQTT_RECONFIG_REPLY", // MQTT reconfig response
  UPLOAD_FREQ_SET: (meterId: string) => `MQTT_COMMOD_SET_${meterId.slice(-8)}`, // Upload frequency set
  UPLOAD_FREQ_SET_REPLY: "MQTT_COMMOD_SET_REP", // Upload frequency set response
  UPLOAD_FREQ_READ: (meterId: string) => `MQTT_COMMOD_READ_${meterId.slice(-8)}`, // Upload frequency read
  UPLOAD_FREQ_READ_REPLY: "MQTT_COMMOD_READ_REP", // Upload frequency read response
  METER_REQUEST_CONFIG: "MQTT_METER_REQ_CFG", // Meter request configuration
  METER_CONFIGURATION_REPLY: "MQTT_METER_REPLY", // Meter config response
  METER_SET_CONFIG: (meterId: string) => `MQTT_SET_${meterId.slice(-8)}`, // Platform sends config
} as const;

// ============================================================================
// Upload Frequency Enums
// ============================================================================

export const VALID_SECOND_LEVELS = [30, 60, 300, 600, 900, 1200, 1800, 3600] as const;
export const VALID_MINUTE_LEVELS = [1, 5, 10, 15, 20, 30, 60, 1440] as const;

export type SecondLevel = typeof VALID_SECOND_LEVELS[number];
export type MinuteLevel = typeof VALID_MINUTE_LEVELS[number];

// ============================================================================
// Generic MQTT Message Wrapper
// ============================================================================

export interface MqttMessage {
  topic: string;
  payload: Record<string, any>;
  timestamp?: number;
  qos?: 0 | 1 | 2;
}
