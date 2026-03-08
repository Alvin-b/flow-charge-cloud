/**
 * Client-side API for MQTT Meter Operations (COMPERE Protocol V1.9)
 *
 * Calls mqtt-meter edge function for outbound commands.
 * Reads mqtt_meter_readings, mqtt_energy_readings, etc. for telemetry.
 */

// ── Local interfaces for MQTT tables ─────────────────────────

export interface MeterReading {
  id?: string;
  meter_id: string;
  reading_time: string;
  ua?: number; ub?: number; uc?: number;
  ia?: number; ib?: number; ic?: number;
  uab?: number; ubc?: number; uca?: number;
  zyggl?: number; zwggl?: number; zszgl?: number;
  f?: number; zglys?: number;
  pfa?: number; pfb?: number; pfc?: number;
  ua_phase_angle?: number; ub_phase_angle?: number; uc_phase_angle?: number;
  ia_phase_angle?: number; ib_phase_angle?: number; ic_phase_angle?: number;
  voltage_unbalance_rate?: number; current_unbalance_rate?: number;
  active_power_demand?: number; reactive_power_demand?: number;
}

export interface EnergyReading {
  id?: string;
  meter_id: string;
  reading_time: string;
  import_total_active?: number; export_total_active?: number;
  import_total_reactive?: number; export_total_reactive?: number;
  ua_thd?: number; ub_thd?: number; uc_thd?: number;
  ia_thd?: number; ib_thd?: number; ic_thd?: number;
}

export interface DailyReading {
  id?: string;
  meter_id: string;
  reading_date: string;
  import_total_active?: number; export_total_active?: number;
  import_total_reactive?: number; export_total_reactive?: number;
}

// ── Helpers ──────────────────────────────────────────────────

async function queryTable<T>(
  tableName: string,
  buildQuery: (query: any) => any
): Promise<{ data: T[] | null; error: any }> {
  const { supabase } = await import("@/integrations/supabase/client");
  const query = (supabase as any).from(tableName).select("*");
  return await buildQuery(query) as { data: T[] | null; error: any };
}

async function querySingle<T>(
  tableName: string,
  buildQuery: (query: any) => any
): Promise<{ data: T | null; error: any }> {
  const { supabase } = await import("@/integrations/supabase/client");
  const query = (supabase as any).from(tableName);
  return await buildQuery(query) as { data: T | null; error: any };
}

async function invokeCommand(action: string, body: Record<string, any>) {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const url = `https://${projectId}.supabase.co/functions/v1/mqtt-meter?action=${action}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  });

  return res.json();
}

// ── Public API ───────────────────────────────────────────────

export const mqttApi = {
  // ── Commands (outbound to meter) ───────────────────────────

  /** Turn relay on (state="1") or off (state="0") */
  relayControl: (meterId: string, state: "0" | "1") =>
    invokeCommand("relay_control", { meter_id: meterId, state }),

  /** Sync meter clock to current UTC time */
  timeSync: (meterId: string) =>
    invokeCommand("time_sync", { meter_id: meterId }),

  /** Read a Modbus register from the meter */
  paramRead: (meterId: string, addr: string, lenth = "1", type = "1") =>
    invokeCommand("param_read", { meter_id: meterId, addr, lenth, type }),

  /** Write a value to a Modbus register */
  paramSet: (meterId: string, addr: string, value: string, type = "1") =>
    invokeCommand("param_set", { meter_id: meterId, addr, value, type }),

  /** Set telemetry upload frequency */
  setUploadFrequency: (meterId: string, level: "second" | "minute", frequency: number) =>
    invokeCommand("upload_freq_set", { meter_id: meterId, level, frequency }),

  /** Read current upload frequency */
  readUploadFrequency: (meterId: string, level: "second" | "minute") =>
    invokeCommand("upload_freq_read", { meter_id: meterId, level }),

  /** Reset meter MQTT connection params */
  reconfig: (meterId: string) =>
    invokeCommand("reconfig", { meter_id: meterId }),

  /** Recall monthly frozen data */
  recallData: (meterId: string, yearMonth: string) =>
    invokeCommand("data_recall", { meter_id: meterId, date: yearMonth }),

  /** Get meter info + latest reading */
  deviceInfo: (meterId: string) =>
    invokeCommand("device_info", { meter_id: meterId }),

  // ── Telemetry queries (read from DB) ───────────────────────

  async getRecentReadings(meterId: string, limit = 100) {
    return queryTable<MeterReading>("mqtt_meter_readings", (q) =>
      q.eq("meter_id", meterId).order("reading_time", { ascending: false }).limit(limit)
    );
  },

  async getEnergyReadings(meterId: string, limit = 100) {
    return queryTable<EnergyReading>("mqtt_energy_readings", (q) =>
      q.eq("meter_id", meterId).order("reading_time", { ascending: false }).limit(limit)
    );
  },

  async getDailyReadings(meterId: string, days = 30) {
    const start = new Date();
    start.setDate(start.getDate() - days);
    return queryTable<DailyReading>("mqtt_daily_readings", (q) =>
      q.eq("meter_id", meterId)
        .gte("reading_date", start.toISOString().split("T")[0])
        .order("reading_date", { ascending: false })
    );
  },

  async getMeterStatus(meterId: string, limit = 10) {
    return queryTable<any>("mqtt_meter_status", (q) =>
      q.eq("meter_id", meterId).order("reading_time", { ascending: false }).limit(limit)
    );
  },

  async getRecentCommands(meterId: string, limit = 20) {
    const { supabase } = await import("@/integrations/supabase/client");
    return supabase.from("meter_commands")
      .select("*")
      .eq("meter_id", meterId)
      .order("created_at", { ascending: false })
      .limit(limit);
  },

  async getRecentOperations(meterId: string, limit = 20) {
    return queryTable<any>("mqtt_operations", (q) =>
      q.eq("meter_id", meterId).order("requested_at", { ascending: false }).limit(limit)
    );
  },

  async getLatestReadingStats(meterId: string) {
    return querySingle<MeterReading>("mqtt_meter_readings", (q) =>
      q.select("ua,ia,zyggl,zwggl,zszgl,f,zglys,pfa,reading_time")
        .eq("meter_id", meterId)
        .order("reading_time", { ascending: false })
        .limit(1)
        .maybeSingle()
    );
  },

  async checkMeterOnline(meterId: string) {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const { data, error } = await queryTable<{ reading_time: string }>("mqtt_meter_readings", (q) =>
      q.select("reading_time")
        .eq("meter_id", meterId)
        .gte("reading_time", fiveMinAgo.toISOString())
        .order("reading_time", { ascending: false })
        .limit(1)
    );
    return { isOnline: !!data?.length, lastReading: data?.[0]?.reading_time || null, error };
  },

  async getDailyConsumptionSummary(meterId: string, days = 7) {
    const start = new Date();
    start.setDate(start.getDate() - days);
    const { data, error } = await queryTable<DailyReading>("mqtt_daily_readings", (q) =>
      q.select("reading_date,import_total_active,export_total_active")
        .eq("meter_id", meterId)
        .gte("reading_date", start.toISOString().split("T")[0])
        .order("reading_date", { ascending: true })
    );

    if (data && data.length > 1) {
      const deltas = [];
      for (let i = 1; i < data.length; i++) {
        deltas.push({
          date: data[i].reading_date,
          import_consumed: (data[i].import_total_active || 0) - (data[i - 1].import_total_active || 0),
          export_generated: (data[i].export_total_active || 0) - (data[i - 1].export_total_active || 0),
        });
      }
      return { data: deltas, error };
    }
    return { data: [], error };
  },
};

export default mqttApi;
