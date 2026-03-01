/**
 * Client-side API for MQTT Meter Operations
 * Provides easy access to meter readings and commands
 */

import { supabase } from "@/integrations/supabase/client";

export const mqttApi = {
  /**
   * Get recent real-time readings for a meter
   */
  async getRecentReadings(meterId: string, limit: number = 100) {
    const { data, error } = await supabase
      .from("mqtt_meter_readings")
      .select("*")
      .eq("meter_id", meterId)
      .order("reading_time", { ascending: false })
      .limit(limit);

    return { data, error };
  },

  /**
   * Get energy data for a meter
   */
  async getEnergyReadings(meterId: string, limit: number = 100) {
    const { data, error } = await supabase
      .from("mqtt_energy_readings")
      .select("*")
      .eq("meter_id", meterId)
      .order("reading_time", { ascending: false })
      .limit(limit);

    return { data, error };
  },

  /**
   * Get daily readings for a meter
   */
  async getDailyReadings(meterId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from("mqtt_daily_readings")
      .select("*")
      .eq("meter_id", meterId)
      .gte("reading_date", startDate.toISOString().split("T")[0])
      .order("reading_date", { ascending: false });

    return { data, error };
  },

  /**
   * Get meter status (DI/DO)
   */
  async getMeterStatus(meterId: string, limit: number = 10) {
    const { data, error } = await supabase
      .from("mqtt_meter_status")
      .select("*")
      .eq("meter_id", meterId)
      .order("reading_time", { ascending: false })
      .limit(limit);

    return { data, error };
  },

  /**
   * Get current meter configuration
   */
  async getMeterConfiguration(meterId: string) {
    const { data, error } = await supabase
      .from("mqtt_configuration")
      .select("*")
      .eq("meter_id", meterId)
      .maybeSingle();

    return { data, error };
  },

  /**
   * Get recent commands for a meter
   */
  async getRecentCommands(meterId: string, limit: number = 20) {
    const { data, error } = await supabase
      .from("mqtt_commands")
      .select("*")
      .eq("meter_id", meterId)
      .order("created_at", { ascending: false })
      .limit(limit);

    return { data, error };
  },

  /**
   * Get recent operations for a meter
   */
  async getRecentOperations(meterId: string, limit: number = 20) {
    const { data, error } = await supabase
      .from("mqtt_operations")
      .select("*")
      .eq("meter_id", meterId)
      .order("requested_at", { ascending: false })
      .limit(limit);

    return { data, error };
  },

  /**
   * Get operation details by ID
   */
  async getOperation(operationId: string) {
    const { data, error } = await supabase
      .from("mqtt_operations")
      .select("*")
      .eq("operation_id", operationId)
      .maybeSingle();

    return { data, error };
  },

  /**
   * Get command details by ID
   */
  async getCommand(operationId: string) {
    const { data, error } = await supabase
      .from("mqtt_commands")
      .select("*")
      .eq("operation_id", operationId)
      .maybeSingle();

    return { data, error };
  },

  /**
   * Get latest reading statistics for a meter
   */
  async getLatestReadingStats(meterId: string) {
    const { data, error } = await supabase
      .from("mqtt_meter_readings")
      .select(
        `
        zyggl,
        zwggl,
        zszgl,
        f,
        pdm,
        qdm,
        pfa,
        pfb,
        pfc,
        reading_time
      `
      )
      .eq("meter_id", meterId)
      .order("reading_time", { ascending: false })
      .limit(1)
      .maybeSingle();

    return { data, error };
  },

  /**
   * Get daily consumption summary
   */
  async getDailyConsumptionSummary(meterId: string, days: number = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from("mqtt_daily_readings")
      .select(
        `
        reading_date,
        import_total_active,
        export_total_active,
        import_total_reactive,
        export_total_reactive
      `
      )
      .eq("meter_id", meterId)
      .gte("reading_date", startDate.toISOString().split("T")[0])
      .order("reading_date", { ascending: true });

    if (data && data.length > 0) {
      // Calculate daily deltas
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

  /**
   * Get meter readings within date range
   */
  async getReadingsByDateRange(
    meterId: string,
    startDate: Date,
    endDate: Date
  ) {
    const { data, error } = await supabase
      .from("mqtt_meter_readings")
      .select("*")
      .eq("meter_id", meterId)
      .gte("reading_time", startDate.toISOString())
      .lte("reading_time", endDate.toISOString())
      .order("reading_time", { ascending: true });

    return { data, error };
  },

  /**
   * Get energy readings within date range
   */
  async getEnergyByDateRange(
    meterId: string,
    startDate: Date,
    endDate: Date
  ) {
    const { data, error } = await supabase
      .from("mqtt_energy_readings")
      .select("*")
      .eq("meter_id", meterId)
      .gte("reading_time", startDate.toISOString())
      .lte("reading_time", endDate.toISOString())
      .order("reading_time", { ascending: true });

    return { data, error };
  },

  /**
   * Calculate total energy consumption for period
   */
  async getTotalConsumption(meterId: string, startDate: Date, endDate: Date) {
    const { data, error } = await supabase
      .from("mqtt_daily_readings")
      .select("import_total_active, export_total_active")
      .eq("meter_id", meterId)
      .gte("reading_date", startDate.toISOString().split("T")[0])
      .lte("reading_date", endDate.toISOString().split("T")[0])
      .order("reading_date", { ascending: true });

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

  /**
   * Get harmonic data for a meter
   */
  async getHarmonicData(meterId: string, limit: number = 30) {
    const { data, error } = await supabase
      .from("mqtt_energy_readings")
      .select(
        `
        reading_time,
        ua_thd,
        ub_thd,
        uc_thd,
        ia_thd,
        ib_thd,
        ic_thd,
        ua_3rd_harmonic,
        ub_3rd_harmonic,
        uc_3rd_harmonic,
        ia_3rd_harmonic,
        ib_3rd_harmonic,
        ic_3rd_harmonic
      `
      )
      .eq("meter_id", meterId)
      .order("reading_time", { ascending: false })
      .limit(limit);

    return { data, error };
  },

  /**
   * Check meter connectivity status
   */
  async checkMeterStatus(meterId: string) {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const { data, error } = await supabase
      .from("mqtt_meter_readings")
      .select("reading_time")
      .eq("meter_id", meterId)
      .gte("reading_time", fiveMinutesAgo.toISOString())
      .order("reading_time", { ascending: false })
      .limit(1)
      .maybeSingle();

    // If we have a recent reading, meter is online
    const isOnline = data !== null && data !== undefined;

    return {
      isOnline,
      lastReading: data?.reading_time || null,
      error,
    };
  },

  /**
   * Get pending operations for a user's meters
   */
  async getUserPendingOperations(userId: string) {
    // Get user's meters
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

    // Get pending operations
    const { data, error } = await supabase
      .from("mqtt_operations")
      .select("*")
      .in("meter_id", meterIds)
      .eq("status", "pending")
      .order("requested_at", { ascending: false });

    return { data, error };
  },
};

export default mqttApi;
