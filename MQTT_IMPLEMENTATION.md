# COMPERE MQTT Protocol Implementation Guide

## Overview

PowerFlow has been enhanced with full support for the **COMPERE MQTT Communication Protocol V1.9**. This allows seamless integration with COMPERE KPM series smart meters (KPM37, KPM312, KPM31A/B/C, KPM33A/B, etc.) that communicate via MQTT.

## Architecture

### Components

1. **MQTT Protocol Types** (`src/lib/mqtt-protocol.ts`)
   - Complete TypeScript interfaces for all COMPERE MQTT messages
   - Topic name constants
   - Meter code utilities
   - Upload frequency enums

2. **MQTT Webhook Handler** (`supabase/functions/mqtt-webhook/index.ts`)
   - Receives MQTT messages from broker
   - Parses COMPERE-specific topic names and payload formats
   - Routes to appropriate handlers for each message type
   - Stores data in PostgreSQL database
   - Updates meter status in real-time

3. **MQTT Command API** (`supabase/functions/mqtt-meter/mqtt-commands.ts`)
   - Deno functions to send commands to meters
   - Supports time sync, parameter read/write, remote control, etc.
   - Operation tracking and response handling

4. **Client API** (`src/lib/mqtt-client-api.ts`)
   - React/TypeScript wrapper for querying meter data
   - Simplified interface for frontend consumption
   - Helper functions for common queries

5. **Database Schema** (`supabase/migrations/20260301120000_add_mqtt_tables.sql`)
   - `mqtt_meter_readings` - Second-level real-time electrical data
   - `mqtt_energy_readings` - Minute-level energy consumption
   - `mqtt_daily_readings` - Daily frozen data snapshots
   - `mqtt_meter_status` - Digital input/output states
   - `mqtt_commands` - Remote control command tracking
   - `mqtt_operations` - Parameter ops, time sync, etc.
   - `mqtt_configuration` - Meter-specific MQTT config

## Setup Instructions

### 1. MQTT Broker Configuration

You need an MQTT broker that supports HTTP webhooks. Recommended options:
- **EMQX** (self-hosted or managed): `/api/v5/publish`
- **HiveMQ** (self-hosted or managed): `/api/v1/mqtt/publish`
- **Mosquitto** (with webhook plugin)
- **AWS IoT Core** (with Lambda integration)

### 2. Configure Webhook

Configure your MQTT broker to forward messages to:
```
POST https://<your-supabase-project>.supabase.co/functions/v1/mqtt-webhook
```

Expected payload format:
```json
{
  "topic": "MQTT_RT_DATA",
  "payload": "{\"id\": \"meter_id\", \"ua\": 220.0, ...}",
  "qos": 1,
  "timestamp": 1234567890,
  "clientid": "device_id"
}
```

### 3. Apply Database Migrations

```bash
supabase db push
```

This creates all MQTT-related tables with proper indexes and RLS policies.

### 4. Deploy Edge Functions

```bash
supabase functions deploy mqtt-webhook
supabase functions deploy mqtt-meter
```

## Message Types Supported

### 1. Real-Time Second-Level Data (MQTT_RT_DATA)

Electrical parameters updated every 30-3600 seconds:
- Three-phase voltages, currents, power
- Power factors, frequency
- Harmonic components
- Temperature readings
- Phase angles and sequence components

**Example handler:**
```typescript
// Automatically processed by mqtt-webhook
// Stored in mqtt_meter_readings table
```

### 2. Minute-Level Energy Data (MQTT_ENY_NOW)

Energy consumption and tariff data updated every 1-1440 minutes:
- Total import/export active energy (kWh)
- Total import/export reactive energy (kvarh)
- Tariff-based breakdown (up to 6 tariffs)
- Monthly max demand records
- Harmonic distortion data

**Example handler:**
```typescript
// Automatically processed by mqtt-webhook
// Stored in mqtt_energy_readings table
```

### 3. Daily Data (MQTT_DAY_DATA)

Daily frozen data snapshot (at 00:00):
- Daily import/export totals
- Per-tariff daily breakdown
- Historical data archival

**Example handler:**
```typescript
// Automatically processed by mqtt-webhook
// Stored in mqtt_daily_readings table
```

### 4. Remote Signal Data (MQTT_TELEIND)

Digital input/output state changes:
- DI (Digital Input) status
- DO (Digital Output) status
- Timestamp of change

**Example handler:**
```typescript
// Automatically processed by mqtt-webhook
// Stored in mqtt_meter_status table
```

### 5. Remote Control Responses (MQTT_TELECTRL_REP)

Response to remote control commands:
- Operation ID
- Success/failure code
- Error message if failed

**Example handler:**
```typescript
// Automatically processed by mqtt-webhook
// Updates mqtt_commands table with response
```

### 6. Time Sync Responses (MQTT_METER_TIME_REP)

Meter confirmation for time synchronization.

### 7. Parameter Operations (MQTT_SYS_SET_REP, MQTT_SYS_REPLY)

Responses to meter parameter read/write operations.

### 8. Configuration Operations

- MQTT_RECONFIG_REPLY
- MQTT_COMMOD_SET_REP (upload frequency set)
- MQTT_COMMOD_READ_REP (upload frequency read)
- MQTT_RECALL_REP (data recall responses)

## Sending Commands to Meters

### Time Synchronization

```typescript
import { supabase } from "@/integrations/supabase/client";
import { sendTimeSync, waitForOperationResponse } from "@/supabase/functions/mqtt-meter/mqtt-commands";

const meterId = "meter-uuid-here";

// Send time sync command
const { success, operationId } = await sendTimeSync(supabase, meterId);

if (success) {
  // Wait for meter response (30 second timeout)
  const { success: responded, data } = await waitForOperationResponse(
    supabase,
    meterId,
    operationId,
    30000
  );

  if (responded) {
    console.log("Time sync successful");
  }
}
```

### Remote Control (Turn Output On/Off)

```typescript
import { sendRemoteControl } from "@/supabase/functions/mqtt-meter/mqtt-commands";

// Turn on output #1
const { operationId } = await sendRemoteControl(
  supabase,
  meterId,
  1,  // DO number (1-32)
  "1" // state: "0" = off, "1" = on
);
```

### Read Meter Parameters

```typescript
import { readMeterParameter } from "@/supabase/functions/mqtt-meter/mqtt-commands";

// Read from Modbus address 0x0000 (PT ratio)
const { operationId } = await readMeterParameter(
  supabase,
  meterId,
  "0000", // Modbus address (hex)
  1,      // length
  "1"     // data type: "1" = integer, "2" = float
);
```

### Set Meter Parameters

```typescript
import { setMeterParameter } from "@/supabase/functions/mqtt-meter/mqtt-commands";

// Set CT ratio to 5A
const { operationId } = await setMeterParameter(
  supabase,
  meterId,
  "0002", // Modbus address (hex)
  "0005", // value
  "1"     // data type: integer
);
```

### Upload Frequency Configuration

```typescript
import { setUploadFrequency, readUploadFrequency } from "@/supabase/functions/mqtt-meter/mqtt-commands";

// Set second-level data upload to 60 seconds
const { operationId: setOpId } = await setUploadFrequency(
  supabase,
  meterId,
  "second",
  60 // Valid: 30, 60, 300, 600, 900, 1200, 1800, 3600
);

// Read minute-level upload frequency
const { operationId: readOpId } = await readUploadFrequency(
  supabase,
  meterId,
  "minute" // Valid: 1, 5, 10, 15, 20, 30, 60, 1440
);
```

### Data Recall (Monthly Frozen Data)

```typescript
import { recallMonthlyData } from "@/supabase/functions/mqtt-meter/mqtt-commands";

// Request October 2025 data
const { operationId } = await recallMonthlyData(
  supabase,
  meterId,
  "202510" // yyyyMM format
);
```

## Querying Meter Data

### Get Recent Readings

```typescript
import mqttApi from "@/lib/mqtt-client-api";

const { data: readings, error } = await mqttApi.getRecentReadings(
  meterId,
  100 // limit
);

// readings[0] contains the latest reading with:
// - ua, ub, uc (phase voltages)
// - ia, ib, ic (phase currents)
// - pa, pb, pc, zyggl (active power)
// - qa, qb, qc, zwggl (reactive power)
// - pfa, pfb, pfc, zglys (power factor)
// - reading_time (timestamp)
```

### Get Energy Consumption

```typescript
const { data: energyData } = await mqttApi.getEnergyReadings(meterId, 50);

// energyData contains:
// - import_total_active (kWh - accumulative)
// - export_total_active (kWh - accumulative)
// - import_tariff1_active through tariff6_active
// - monthly_max_active_power_demand
// - harmonic distortion data
```

### Get Daily Consumption

```typescript
const { data: dailyData } = await mqttApi.getDailyReadings(meterId, 30);

// Get consumption delta for each day
const { data: deltas } = await mqttApi.getDailyConsumptionSummary(meterId, 7);

// deltas[0] = {
//   date: "2026-03-01",
//   import_consumed: 15.5,  // kWh consumed that day
//   export_generated: 0
// }
```

### Check Meter Status

```typescript
const { isOnline, lastReading } = await mqttApi.checkMeterStatus(meterId);

if (isOnline) {
  console.log(`Meter is online, last reading: ${lastReading}`);
} else {
  console.log("Meter has been offline for more than 5 minutes");
}
```

### Get Total Consumption for Period

```typescript
const startDate = new Date();
startDate.setDate(startDate.getDate() - 30); // 30 days ago

const { importTotal, exportTotal } = await mqttApi.getTotalConsumption(
  meterId,
  startDate,
  new Date()
);

console.log(`Consumed: ${importTotal} kWh, Generated: ${exportTotal} kWh`);
```

## Database Schema

### mqtt_meter_readings
Stores second-level real-time electrical parameters. Indexed by `(meter_id, reading_time DESC)` for efficient queries.

Fields:
- Primary electrical parameters: ua, ub, uc, ia, ib, ic, pa, pb, pc, etc.
- Power quality: harmonics, power factors, unbalance rates
- Temperature: ta, tb, tc, tn
- Timestamp: reading_time, received_at

### mqtt_energy_readings
Stores minute-level aggregated energy consumption data.

Fields:
- Total energy: import_total_active, export_total_active
- Tariff breakdown (up to 6 tariffs)
- Monthly max demand records
- Harmonic distortion (THD, 3rd/5th/7th harmonics)

### mqtt_daily_readings
Stores daily frozen snapshots taken at 00:00. Unique constraint on (meter_id, reading_date).

Fields:
- Daily import/export at 00:00 reset
- Tariff-based daily values
- reading_date for grouping by calendar day

### mqtt_meter_status
Tracks digital input/output state changes.

Fields:
- digital_inputs: binary string (e.g., "00000003")
- digital_outputs: binary string
- reading_time: when the state change occurred

### mqtt_commands
Tracks remote control commands and their responses.

Fields:
- operation_id: unique command ID
- command_type: 'remote_control', etc.
- status: pending → acknowledged/failed
- response_code: "01" = success, "02" = failed
- digital_output_number, digital_output_state

### mqtt_operations
Tracks parameter operations, time sync, data recall, config changes.

Fields:
- operation_id: unique operation ID
- operation_type: 'parameter_set', 'time_sync', 'upload_freq_set', etc.
- status: pending → completed/failed
- response_code, response_message
- modbus_address, requested_value, read_value (for parameter ops)

### mqtt_configuration
Stores meter-specific MQTT configuration.

Fields:
- mqtt_broker_ip, mqtt_broker_port
- mqtt_username, mqtt_password_encrypted
- wifi_ssid, wifi_password_encrypted
- second_level_upload_frequency
- minute_level_upload_frequency
- synchronized_at: last time meter was synced

## RLS Policies

All MQTT tables have row-level security enabled:

- **Users can only see their own meters' data** - SELECT restricted to meters owned by auth.uid()
- **Service role can insert MQTT data** - Webhook functions use service role key
- **Users can create their own commands** - Limited to their meters

## Monitoring & Troubleshooting

### Check if meter is online

```typescript
const { isOnline, lastReading } = await mqttApi.checkMeterStatus(meterId);
```

### View recent operations

```typescript
const { data: ops } = await mqttApi.getRecentOperations(meterId, 20);

ops.forEach(op => {
  console.log(`
    Operation: ${op.operation_type}
    Status: ${op.status}
    Response: ${op.response_code === "01" ? "✓" : "✗"}
    Timestamp: ${op.requested_at}
  `);
});
```

### Check webhook logs

```bash
supabase functions logs mqtt-webhook --tail
```

### Common Issues

**No data appearing in mqtt_meter_readings:**
1. Verify webhook is configured correctly in MQTT broker
2. Check function logs for errors
3. Confirm meter ID in payload matches database

**Commands not being sent to meter:**
1. Verify mqtt-meter function is deployed
2. Check MQTT broker HTTP API credentials
3. Ensure operation records are created in database

**Old data not being purged:**
- Implement a cron job to archive or delete old readings
- Consider partitioning large tables by date

## Performance Considerations

### Indexing
All main tables have indexes on:
- `(meter_id, reading_time DESC)` for time-series queries
- `meter_id, status` for operations/commands filtering
- `operation_id` for operation lookup

### Query Optimization
- Use `limit()` on large result sets
- Filter by date range when possible
- Consider materialized views for aggregations

### Storage
- mqtt_meter_readings: ~1-2KB per reading × 60+ readings/hour = ~1-2GB/meter/month
- mqtt_energy_readings: ~500B per reading × 1440 readings/day = ~200MB/meter/month
- Plan for archive/retention policies

## Future Enhancements

1. **Batch MQTT Operations** - Send multiple commands in single operation
2. **Automated Response Polling** - Built-in polling with exponential backoff
3. **MQTT Publisher** - Direct publish to meter without HTTP API
4. **Data Aggregation** - Cron job for rolling up minute → hourly → daily
5. **Alerts & Thresholds** - Trigger notifications on anomalies
6. **Multi-Meter Sync** - Synchronize time/config across multiple meters at once

## Example: Power Quality Monitoring Dashboard

```typescript
// Get latest power quality metrics
const { data: latest } = await mqttApi.getLatestReadingStats(meterId);

// Get harmonic data
const { data: harmonics } = await mqttApi.getHarmonicData(meterId, 30);

// Get daily consumption trend
const { data: dailyTrend } = await mqttApi.getDailyReadings(meterId, 30);

// Display in dashboard
console.log(`
  Latest Reading:
  - Frequency: ${latest.f} Hz
  - Total Power: ${latest.zyggl} kW
  - Power Factor: ${latest.zglys}
  - Voltage Unbalance: ${latest.unb}%
  
  Harmonics (Latest):
  - UA THD: ${latest.ua_thd}%
  - UB THD: ${latest.ub_thd}%
  - UC THD: ${latest.uc_thd}%
`);
```

## References

- **COMPERE Protocol Specification**: v1.9
- **Supabase Documentation**: https://supabase.com/docs
- **EMQX Webhook Documentation**: https://docs.emqx.io/emqx/v5.0/
