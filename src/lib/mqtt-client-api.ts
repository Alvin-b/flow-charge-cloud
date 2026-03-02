/**
 * Client-side API for MQTT Meter Operations
 * Provides easy access to meter readings and commands
 * 
 * Note: These tables (mqtt_meter_readings, mqtt_energy_readings, etc.)
 * are queried dynamically and may not yet exist in the auto-generated types.
 * We use explicit interfaces and cast via supabase.from<any>() to handle this.
 */

// Local interfaces for MQTT tables not yet in auto-generated types
export interface MeterReading {
  id?: string;
  meter_id: string;
  reading_time: string;
  ua?: number;
  ub?: number;
  uc?: number;
  ia?: number;
  ib?: number;
  ic?: number;
  uab?: number;
  ubc?: number;
  uca?: number;
  zyggl?: number;   // total active power
  zwggl?: number;   // total reactive power
  zszgl?: number;   // total apparent power
  f?: number;        // frequency
  zglys?: number;    // total power factor
  pdm?: number;
  qdm?: number;
  pfa?: number;
  pfb?: number;
  pfc?: number;
  ua_phase_angle?: number;
  ub_phase_angle?: number;
  uc_phase_angle?: number;
  ia_phase_angle?: number;
  ib_phase_angle?: number;
  ic_phase_angle?: number;
  voltage_unbalance_rate?: number;
  current_unbalance_rate?: number;
  active_power_demand?: number;
}

export interface EnergyReading {
  id?: string;
  meter_id: string;
  reading_time: string;
  import_total_active?: number;
  export_total_active?: number;
  import_total_reactive?: number;
  export_total_reactive?: number;
  ua_thd?: number;
  ub_thd?: number;
  uc_thd?: number;
  ia_thd?: number;
  ib_thd?: number;
  ic_thd?: number;
  ua_3rd_harmonic?: number;
  ub_3rd_harmonic?: number;
  uc_3rd_harmonic?: number;
  ia_3rd_harmonic?: number;
  ib_3rd_harmonic?: number;
  ic_3rd_harmonic?: number;
}

export interface DailyReading {
  id?: string;
  meter_id: string;
  reading_date: string;
  import_total_active?: number;
  export_total_active?: number;
  import_total_reactive?: number;
  export_total_reactive?: number;
}

export interface MqttOperation {
  operation_id: string;
  meter_id: string;
  operation_type: string;
  status: string;
  requested_at: string;
  completed_at?: string;
  response_data?: any;
}

/**
 * Helper to query tables not in the auto-generated schema.
 * Returns typed results by casting through any.
 */
async function queryTable<T>(
  tableName: string,
  buildQuery: (query: any) => any
): Promise<{ data: T[] | null; error: any }> {
  const { supabase } = await import("@/integrations/supabase/client");
  const query = (supabase as any).from(tableName).select("*");
  const result = await buildQuery(query);
  return result as { data: T[] | null; error: any };
}

async function querySingle<T>(
  tableName: string,
  buildQuery: (query: any) => any
): Promise<{ data: T | null; error: any }> {
  const { supabase } = await import("@/integrations/supabase/client");
  const query = (supabase as any).from(tableName);
  const result = await buildQuery(query);
  return result as { data: T | null; error: any };
}

export const mqttApi = {
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
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    return queryTable<DailyReading>("mqtt_daily_readings", (q) =>
      q.eq("meter_id", meterId)
        .gte("reading_date", startDate.toISOString().split("T")[0])
        .order("reading_date", { ascending: false })
    );
  },

  async getMeterStatus(meterId: string, limit = 10) {
    return queryTable<any>("mqtt_meter_status", (q) =>
      q.eq("meter_id", meterId).order("reading_time", { ascending: false }).limit(limit)
    );
  },

  async getMeterConfiguration(meterId: string) {
    return querySingle<any>("mqtt_configuration", (q) =>
      q.select("*").eq("meter_id", meterId).maybeSingle()
    );
  },

  async getRecentCommands(meterId: string, limit = 20) {
    return queryTable<any>("mqtt_commands", (q) =>
      q.eq("meter_id", meterId).order("created_at", { ascending: false }).limit(limit)
    );
  },

  async getRecentOperations(meterId: string, limit = 20) {
    return queryTable<MqttOperation>("mqtt_operations", (q) =>
      q.eq("meter_id", meterId).order("requested_at", { ascending: false }).limit(limit)
    );
  },

  async getOperation(operationId: string) {
    return querySingle<MqttOperation>("mqtt_operations", (q) =>
      q.select("*").eq("operation_id", operationId).maybeSingle()
    );
  },

  async getCommand(operationId: string) {
    return querySingle<any>("mqtt_commands", (q) =>
      q.select("*").eq("operation_id", operationId).maybeSingle()
    );
  },

  async getLatestReadingStats(meterId: string) {
    return querySingle<MeterReading>("mqtt_meter_readings", (q) =>
      q.select("zyggl,zwggl,zszgl,f,pdm,qdm,pfa,pfb,pfc,reading_time")
        .eq("meter_id", meterId)
        .order("reading_time", { ascending: false })
        .limit(1)
        .maybeSingle()
    );
  },

  async getDailyConsumptionSummary(meterId: string, days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await queryTable<DailyReading>("mqtt_daily_readings", (q) =>
      q.select("reading_date,import_total_active,export_total_active,import_total_reactive,export_total_reactive")
        .eq("meter_id", meterId)
        .gte("reading_date", startDate.toISOString().split("T")[0])
        .order("reading_date", { ascending: true })
    );

    if (data && data.length > 0) {
      const deltas = [];
      for (let i = 1; i < data.length; i++) {
        const prev = data[i - 1];
        const curr = data[i];
        deltas.push({
          date: curr.reading_date,
          import_consumed: (curr.import_total_active || 0) - (prev.import_total_active || 0),
          export_generated: (curr.export_total_active || 0) - (prev.export_total_active || 0),
        });
      }
      return { data: deltas, error };
    }

    return { data: [], error };
  },

  async getReadingsByDateRange(meterId: string, startDate: Date, endDate: Date) {
    return queryTable<MeterReading>("mqtt_meter_readings", (q) =>
      q.eq("meter_id", meterId)
        .gte("reading_time", startDate.toISOString())
        .lte("reading_time", endDate.toISOString())
        .order("reading_time", { ascending: true })
    );
  },

  async getEnergyByDateRange(meterId: string, startDate: Date, endDate: Date) {
    return queryTable<EnergyReading>("mqtt_energy_readings", (q) =>
      q.eq("meter_id", meterId)
        .gte("reading_time", startDate.toISOString())
        .lte("reading_time", endDate.toISOString())
        .order("reading_time", { ascending: true })
    );
  },

  async getTotalConsumption(meterId: string, startDate: Date, endDate: Date) {
    const { data, error } = await queryTable<DailyReading>("mqtt_daily_readings", (q) =>
      q.select("import_total_active,export_total_active")
        .eq("meter_id", meterId)
        .gte("reading_date", startDate.toISOString().split("T")[0])
        .lte("reading_date", endDate.toISOString().split("T")[0])
        .order("reading_date", { ascending: true })
    );

    if (error || !data || data.length === 0) {
      return { importTotal: 0, exportTotal: 0, error };
    }

    const first = data[0];
    const last = data[data.length - 1];

    return {
      importTotal: (last.import_total_active || 0) - (first.import_total_active || 0),
      exportTotal: (last.export_total_active || 0) - (first.export_total_active || 0),
      error: null,
    };
  },

  async getHarmonicData(meterId: string, limit = 30) {
    return queryTable<EnergyReading>("mqtt_energy_readings", (q) =>
      q.select("reading_time,ua_thd,ub_thd,uc_thd,ia_thd,ib_thd,ic_thd,ua_3rd_harmonic,ub_3rd_harmonic,uc_3rd_harmonic,ia_3rd_harmonic,ib_3rd_harmonic,ic_3rd_harmonic")
        .eq("meter_id", meterId)
        .order("reading_time", { ascending: false })
        .limit(limit)
    );
  },

  async checkMeterStatus(meterId: string) {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const { data, error } = await queryTable<{ reading_time: string }>("mqtt_meter_readings", (q) =>
      q.select("reading_time")
        .eq("meter_id", meterId)
        .gte("reading_time", fiveMinutesAgo.toISOString())
        .order("reading_time", { ascending: false })
        .limit(1)
    );

    const isOnline = data !== null && data.length > 0;

    return {
      isOnline,
      lastReading: data?.[0]?.reading_time || null,
      error,
    };
  },

  async getUserPendingOperations(userId: string) {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: meters, error: metersError } = await supabase
      .from("meters")
      .select("id")
      .eq("user_id", userId);

    if (metersError || !meters) {
      return { data: [], error: metersError };
    }

    const meterIds = meters.map((m) => m.id);

    if (meterIds.length === 0) {
      return { data: [], error: null };
    }

    return queryTable<MqttOperation>("mqtt_operations", (q) =>
      q.in("meter_id", meterIds)
        .eq("status", "pending")
        .order("requested_at", { ascending: false })
    );
  },
};

export default mqttApi;
