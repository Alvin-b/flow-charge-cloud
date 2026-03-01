# COMPERE MQTT Protocol Reference (V1.9) — PowerFlow Integration

## Meter: DDS666 Single Phase Prepaid Energy Meter with 4G
- Prepaid: credit decreases with usage, alarm at 5 kWh, relay cuts off at 0 kWh
- Restored via 4G remote recharge
- Single phase 220-240V, Class 1, DIN rail

## MQTT Topics Summary

### Meter → Platform (meter publishes, platform subscribes)
| Topic | Data | Frequency |
|---|---|---|
| `MQTT_RT_DATA` | Real-time second-level data (V, A, kW, kvar, kVA, PF, Hz) | Configurable: 30-3600s |
| `MQTT_ENY_NOW` | Minute-level energy data (import/export active/reactive kWh, tariffs) | Configurable: 1-1440 min |
| `MQTT_DAY_DATA` | Daily energy snapshots at 00:00 | Daily |
| `MQTT_TELEIND` | Remote signal (DI/DO state changes) | On change |
| `MQTT_TELECTRL_REP` | Remote control response | On command |
| `MQTT_METER_TIME_REP` | Time sync response | On command |
| `MQTT_SYS_SET_REP` | Parameter set response | On command |
| `MQTT_SYS_REPLY` | Parameter read response | On command |
| `MQTT_RECONFIG_REPLY` | MQTT reconfig response | On command |
| `MQTT_COMMOD_SET_REP` | Upload frequency set/read response | On command |
| `MQTT_METER_REQ_CFG` | Meter requests configuration | On boot |
| `MQTT_METER_REPLY` | Configuration success/fail | On config |
| `MQTT_RECALL_REP` | Data recall response (monthly frozen) | On command |

### Platform → Meter (platform publishes, meter subscribes)
Topic suffix `{last8}` = last 8 characters of the meter ID.

| Topic | Payload | Purpose |
|---|---|---|
| `MQTT_TELECTRL_{last8}` | `{"dox":"1","oprid":"<32chars>"}` | Relay ON/OFF (do1: "1"=on, "0"=off) |
| `MQTT_SETTIME_{last8}` | `{"oprid":"<32>","time":"yyyymmddhhmmss"}` | Time synchronization |
| `MQTT_SYS__CFG_{last8}` | `{"oprid":"<32>","addr":"XXXX","value":"...","type":"1"}` | Set meter parameter (Modbus register) |
| `MQTT_SYS_READ_{last8}` | `{"oprid":"<32>","addr":"XXXX","lenth":"n","type":"1"}` | Read meter parameter |
| `MQTT_RECONFIG_{last8}` | `{"oprid":"<32>"}` | Reset MQTT connection params |
| `MQTT_COMMOD_SET_{last8}` | `{"oprid":"<32>","Cmd":"0000","value":"30","types":"1"}` | Set upload frequency (Cmd 0000=sec, 0001=min) |
| `MQTT_COMMOD_READ_{last8}` | `{"oprid":"<32>","Cmd":"0000","types":"1"}` | Read upload frequency |
| `MQTT_RECALL_{last8}` | `{"date":"yyyyMM","oprid":"<32>","oprtype":"2"}` | Recall monthly frozen data |
| `MQTT_SET_{last8}` | `{"info":"ip;port;user;pass"}` | 4G meter MQTT server reconfig |

## Response Format
All responses include:
```json
{
  "id": "meter_id",
  "oprid": "Operation id (32 chars)",
  "code": "01",  // 01=success, 02=fail
  "msg": "..."   // failure reason (optional)
}
```

## Key Real-Time Data Fields (MQTT_RT_DATA for single-phase DDS666)
| Field | Description | Unit |
|---|---|---|
| `ua` | Voltage | V |
| `ia` | Current | A |
| `pa` / `zyggl` | Active power / Total active power | kW |
| `qa` / `zwggl` | Reactive power / Total reactive | kvar |
| `sa` / `zszgl` | Apparent power / Total apparent | kVA |
| `pfa` / `zglys` | Power factor / Total PF | - |
| `f` | Frequency | Hz |

## Key Energy Fields (MQTT_ENY_NOW)
| Field | Description | Unit |
|---|---|---|
| `zygsz` | Import total active energy | kWh |
| `fygsz` | Export total active energy | kWh |
| `zwgsz` | Import total reactive energy | kvarh |
| `fwgsz` | Export total reactive energy | kvarh |

## Meter ID Code (13 digits)
Format: `XXX-X-X-XX-X-X-XXXX`
- Meter model code (position 4): 0=KPM37, 1=KPM31A, etc.
- Communication (position 8): 0=RS485, 1=4G, 2=WIFI, 3=Lora

## Split Packets
WiFi meters send data in split packets (distinguished by `isend` field).
4G meters typically send in 1-2 packages.
`isend: "1"` = final packet, `isend: "0"` = more packets follow.
