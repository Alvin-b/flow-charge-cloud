/**
 * MQTT Meter Command API
 * Provides functions to send commands to COMPERE MQTT meters
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Generate a 32-bit operation ID
 */
export function generateOperationId(): string {
  // Generate a 32-character hex string UUID
  return crypto.randomUUID().replace(/-/g, "");
}

/**
 * Send time sync command to a meter
 */
export async function sendTimeSync(
  supabase: SupabaseClient,
  meterId: string,
  targetTime?: Date
): Promise<{ success: boolean; operationId: string; error?: string }> {
  const time = targetTime || new Date();
  const timeStr = formatCompereTime(time);
  const operationId = generateOperationId();

  // Insert operation record
  const { error } = await supabase.from("mqtt_operations").insert({
    meter_id: meterId,
    operation_id: operationId,
    operation_type: "time_sync",
    status: "pending",
    requested_at: new Date().toISOString(),
  });

  if (error) {
    return { success: false, operationId, error: error.message };
  }

  // TODO: Publish to MQTT topic MQTT_SETTIME_<last8digits>
  // Payload: { oprid, time }

  return { success: true, operationId };
}

/**
 * Read meter parameters
 */
export async function readMeterParameter(
  supabase: SupabaseClient,
  meterId: string,
  modbusAddress: string,
  length: number = 1,
  dataType: "1" | "2" = "1" // 1=integer, 2=float
): Promise<{ success: boolean; operationId: string; error?: string }> {
  const operationId = generateOperationId();

  const { error } = await supabase.from("mqtt_operations").insert({
    meter_id: meterId,
    operation_id: operationId,
    operation_type: "parameter_read",
    modbus_address: modbusAddress,
    parameter_length: length,
    data_type: dataType,
    status: "pending",
    requested_at: new Date().toISOString(),
  });

  if (error) {
    return { success: false, operationId, error: error.message };
  }

  // TODO: Publish to MQTT topic MQTT_SYS_READ_<last8digits>
  // Payload: { oprid, addr, lenth, type }

  return { success: true, operationId };
}

/**
 * Set meter parameters
 */
export async function setMeterParameter(
  supabase: SupabaseClient,
  meterId: string,
  modbusAddress: string,
  value: string,
  dataType: "1" | "2" = "1" // 1=integer, 2=float
): Promise<{ success: boolean; operationId: string; error?: string }> {
  const operationId = generateOperationId();

  const { error } = await supabase.from("mqtt_operations").insert({
    meter_id: meterId,
    operation_id: operationId,
    operation_type: "parameter_set",
    modbus_address: modbusAddress,
    requested_value: value,
    data_type: dataType,
    status: "pending",
    requested_at: new Date().toISOString(),
  });

  if (error) {
    return { success: false, operationId, error: error.message };
  }

  // TODO: Publish to MQTT topic MQTT_SYS_CFG_<last8digits>
  // Payload: { oprid, addr, value, type }

  return { success: true, operationId };
}

/**
 * Send remote control command (turn output on/off)
 */
export async function sendRemoteControl(
  supabase: SupabaseClient,
  meterId: string,
  doNumber: number, // 1-32
  state: "0" | "1" // 0=off, 1=on
): Promise<{ success: boolean; operationId: string; error?: string }> {
  const operationId = generateOperationId();

  const { error } = await supabase.from("mqtt_commands").insert({
    meter_id: meterId,
    operation_id: operationId,
    command_type: "remote_control",
    digital_output_number: doNumber,
    digital_output_state: state,
    status: "pending",
    created_at: new Date().toISOString(),
  });

  if (error) {
    return { success: false, operationId, error: error.message };
  }

  // TODO: Publish to MQTT topic MQTT_TELECTRL_<last8digits>
  // Payload: { dox: state, oprid }

  return { success: true, operationId };
}

/**
 * Reconfigure MQTT settings on meter
 */
export async function reconfigureMqtt(
  supabase: SupabaseClient,
  meterId: string
): Promise<{ success: boolean; operationId: string; error?: string }> {
  const operationId = generateOperationId();

  const { error } = await supabase.from("mqtt_operations").insert({
    meter_id: meterId,
    operation_id: operationId,
    operation_type: "reconfig",
    status: "pending",
    requested_at: new Date().toISOString(),
  });

  if (error) {
    return { success: false, operationId, error: error.message };
  }

  // TODO: Publish to MQTT topic MQTT_RECONFIG_<last8digits>
  // Payload: { oprid }

  return { success: true, operationId };
}

/**
 * Set upload frequency
 */
export async function setUploadFrequency(
  supabase: SupabaseClient,
  meterId: string,
  level: "second" | "minute",
  frequency: number
): Promise<{ success: boolean; operationId: string; error?: string }> {
  const operationId = generateOperationId();
  const cmd = level === "second" ? "0000" : "0001";

  // Validate frequency
  const secondLevelValid = [30, 60, 300, 600, 900, 1200, 1800, 3600];
  const minuteLevelValid = [1, 5, 10, 15, 20, 30, 60, 1440];

  const isValid =
    level === "second"
      ? secondLevelValid.includes(frequency)
      : minuteLevelValid.includes(frequency);

  if (!isValid) {
    return {
      success: false,
      operationId,
      error: `Invalid ${level}-level frequency: ${frequency}`,
    };
  }

  const { error } = await supabase.from("mqtt_operations").insert({
    meter_id: meterId,
    operation_id: operationId,
    operation_type: "upload_freq_set",
    command_type: cmd,
    requested_value: frequency.toString(),
    status: "pending",
    requested_at: new Date().toISOString(),
  });

  if (error) {
    return { success: false, operationId, error: error.message };
  }

  // TODO: Publish to MQTT topic MQTT_COMMOD_SET_<last8digits>
  // Payload: { oprid, Cmd, value, types }

  return { success: true, operationId };
}

/**
 * Read upload frequency
 */
export async function readUploadFrequency(
  supabase: SupabaseClient,
  meterId: string,
  level: "second" | "minute"
): Promise<{ success: boolean; operationId: string; error?: string }> {
  const operationId = generateOperationId();
  const cmd = level === "second" ? "0000" : "0001";

  const { error } = await supabase.from("mqtt_operations").insert({
    meter_id: meterId,
    operation_id: operationId,
    operation_type: "upload_freq_read",
    command_type: cmd,
    status: "pending",
    requested_at: new Date().toISOString(),
  });

  if (error) {
    return { success: false, operationId, error: error.message };
  }

  // TODO: Publish to MQTT topic MQTT_COMMOD_READ_<last8digits>
  // Payload: { oprid, Cmd, types }

  return { success: true, operationId };
}

/**
 * Request data recall (monthly frozen data)
 */
export async function recallMonthlyData(
  supabase: SupabaseClient,
  meterId: string,
  yearMonth: string // yyyyMM format
): Promise<{ success: boolean; operationId: string; error?: string }> {
  const operationId = generateOperationId();

  const { error } = await supabase.from("mqtt_operations").insert({
    meter_id: meterId,
    operation_id: operationId,
    operation_type: "data_recall",
    recall_date: yearMonth,
    recall_type: "2", // 2 = monthly
    status: "pending",
    requested_at: new Date().toISOString(),
  });

  if (error) {
    return { success: false, operationId, error: error.message };
  }

  // TODO: Publish to MQTT topic MQTT_RECALL_<last8digits>
  // Payload: { oprid, date, oprtype: "2" }

  return { success: true, operationId };
}

/**
 * Wait for operation response with timeout
 */
export async function waitForOperationResponse(
  supabase: SupabaseClient,
  meterId: string,
  operationId: string,
  timeoutMs: number = 30000
): Promise<{ success: boolean; data?: any; error?: string }> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const { data, error } = await supabase
      .from("mqtt_operations")
      .select("*")
      .eq("operation_id", operationId)
      .eq("meter_id", meterId)
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }

    if (data) {
      if (data.status === "completed") {
        return { success: true, data };
      } else if (data.status === "failed") {
        return {
          success: false,
          error: data.response_message || "Operation failed",
        };
      }
    }

    // Wait 500ms before polling again
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return { success: false, error: "Operation timeout" };
}

/**
 * Format date to COMPERE time format (yyyyMMddHHmmss)
 */
export function formatCompereTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    date.getUTCFullYear() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds())
  );
}

/**
 * Parse COMPERE time format to Date
 */
export function parseCompereTime(timeStr: string): Date | null {
  if (!timeStr || timeStr.length < 8) return null;
  try {
    const year = parseInt(timeStr.substring(0, 4));
    const month = parseInt(timeStr.substring(4, 6));
    const day = parseInt(timeStr.substring(6, 8));
    const hour = timeStr.length >= 10 ? parseInt(timeStr.substring(8, 10)) : 0;
    const minute = timeStr.length >= 12 ? parseInt(timeStr.substring(10, 12)) : 0;
    const second = timeStr.length >= 14 ? parseInt(timeStr.substring(12, 14)) : 0;

    return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  } catch (e) {
    console.error("Failed to parse COMPERE time:", timeStr, e);
    return null;
  }
}
