# COMPERE MQTT Broker Integration Guide

This guide explains how to configure your MQTT broker to integrate with PowerFlow for receiving COMPERE meter data.

## Overview

PowerFlow receives meter data via MQTT webhooks. When your MQTT broker receives messages from meters, it can forward them to PowerFlow's webhook endpoint for processing.

## Supported MQTT Brokers

### 1. EMQX (Recommended)

EMQX is a popular open-source MQTT broker with excellent webhook support.

#### Installation (Docker)

```bash
docker run -d \
  --name emqx \
  -p 1883:1883 \
  -p 8883:8883 \
  -p 8084:8084 \
  -p 18083:18083 \
  emqx/emqx:5.0
```

Access Admin Dashboard: `http://localhost:18083` (default: admin/public)

#### Configure Webhook Integration

1. **In EMQX Dashboard**, go to **Extensions → Webhooks**

2. **Create a new webhook** with these settings:

```
Type: msg-delivered (or msg-publish for all messages)
Enable: ✓
Webhook URL: https://<your-supabase-project>.supabase.co/functions/v1/mqtt-webhook
Method: POST
Headers: (leave empty or add auth header if configured)
Body: 
{
  "topic": "${topic}",
  "payload": "${payload}",
  "qos": ${qos},
  "timestamp": ${timestamp},
  "clientid": "${clientid}"
}
```

3. **Save** the webhook

#### Enable MQTT Broker for Meters

1. Go to **System Settings → Listeners**
2. Ensure **MQTT TCP** is enabled on port 1883
3. Configure authentication if needed:
   - Go to **Access Control → Authentication**
   - Add users for meter devices

#### Configure Meters (KPM37, KPM312, etc.)

Meters need to be configured with MQTT broker connection details:

**Via Modbus (or meter configuration interface):**
- MQTT Broker IP: Your server IP or domain
- MQTT Broker Port: 1883
- MQTT Username: meter_user (if configured)
- MQTT Password: meter_pass (if configured)
- MQTT Topic: Meters publish to topics like `MQTT_RT_DATA`, `MQTT_ENY_NOW`, etc. (handled automatically by meter)

**Client ID format for meter:**
- Must be unique for each meter
- Use meter serial number or ID
- Example: `METER_3120208700001`

### 2. HiveMQ

HiveMQ is another excellent MQTT broker with webhook support.

#### Docker Setup

```bash
docker run -d \
  --name hivemq \
  -p 1883:1883 \
  -p 8080:8080 \
  -p 9600:9600 \
  hivemq/hivemq4
```

Control Center: `http://localhost:8080`

#### Configure Webhook (HiveMQ 4)

1. Access HiveMQ Control Center
2. Go to **Manage → Extension Manager**
3. Add Webhook extension via plugin
4. Configure in `extensions/webhook/conf.xml`:

```xml
<webhooks>
    <webhook>
        <id>powerflow-mqtt</id>
        <url>https://<your-supabase-project>.supabase.co/functions/v1/mqtt-webhook</url>
        <qos>1</qos>
        <payload-format>json</payload-format>
        <topics>
            <topic-filter>MQTT_RT_DATA</topic-filter>
            <topic-filter>MQTT_ENY_NOW</topic-filter>
            <topic-filter>MQTT_DAY_DATA</topic-filter>
            <topic-filter>MQTT_TELEIND</topic-filter>
            <topic-filter>MQTT_TELECTRL_REP</topic-filter>
            <!-- ... add other topics as needed ... -->
        </topics>
    </webhook>
</webhooks>
```

### 3. Mosquitto

Mosquitto is lightweight but requires additional setup for webhooks.

#### Installation

```bash
# Ubuntu/Debian
sudo apt-get install mosquitto mosquitto-clients

# Or Docker
docker run -d \
  --name mosquitto \
  -p 1883:1883 \
  -p 9001:9001 \
  eclipse-mosquitto
```

#### Webhook Integration with Mosquitto

Mosquitto doesn't have native webhook support. Use a bridge instead:

```bash
# Bridge to another broker that supports webhooks, or use
# a message forwarder like Node-RED between Mosquitto and PowerFlow
```

#### Alternative: Use Node-RED

1. Install Node-RED
2. Create an MQTT input node connected to Mosquitto
3. Add HTTP POST node to send to PowerFlow webhook
4. Deploy

```ini
# Node-RED flow example
[
  {
    "id": "mqtt-in",
    "type": "mqtt in",
    "broker": "localhost:1883",
    "topic": "MQTT_#"
  },
  {
    "id": "http-post",
    "type": "http request",
    "method": "POST",
    "url": "https://<project>.supabase.co/functions/v1/mqtt-webhook"
  }
]
```

## Environment Configuration

### Setting Broker Credentials (if needed)

If your MQTT broker requires authentication for webhook delivery, configure in Supabase:

1. **Initialize a .env file** (for local development):

```bash
# .env.local
VITE_MQTT_WEBHOOK_URL=https://<project>.supabase.co/functions/v1/mqtt-webhook
```

2. **For production**, set environment variables in Supabase Dashboard:
   - Go to **Settings → API**
   - Add environment variables as needed

## Testing the Integration

### Test 1: Publish a Sample Message

```bash
# Using mosquitto-pub (if you have Mosquitto installed)
mosquitto_pub -h broker.example.com -t MQTT_RT_DATA -m '{
  "id": "test-meter-001",
  "ua": 220.5,
  "ub": 219.8,
  "uc": 221.2,
  "ia": 5.2,
  "ib": 5.0,
  "ic": 5.3,
  "pa": 2.5,
  "pb": 2.3,
  "pc": 2.6,
  "zyggl": 7.4,
  "f": 50.0,
  "time": "20260301120000",
  "isend": "1"
}'
```

### Test 2: Check PowerFlow Logs

```bash
supabase functions logs mqtt-webhook --tail
```

You should see:
```
[MQTT Webhook] Topic: MQTT_RT_DATA, Payload: {...}
[MQTT_RT_DATA] Stored reading for meter test-meter-001
```

### Test 3: Query the Database

```bash
# Check if data was stored
curl -X POST https://<project>.supabase.co/rest/v1/rpc/exec \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "sql": "SELECT * FROM mqtt_meter_readings WHERE meter_id = '\''test-meter-001'\'' ORDER BY received_at DESC LIMIT 1"
  }'
```

## Meter Configuration Examples

### KPM37 Configuration (via Modbus)

| Register | Description | Example Value |
|----------|-------------|----------------|
| 0x0100 | MQTT Broker IP | 192.168.1.100 |
| 0x0101 | MQTT Broker Port | 1883 |
| 0x0102 | MQTT Username | meter_user |
| 0x0103 | MQTT Password | meter_pass |
| 0x0104 | MQTT Client ID | KPM37_0001 |
| 0x0105 | Upload Frequency (seconds) | 60 |

### KPM312 Configuration

Similar to KPM37, but note:
- KPM312 has 4 loop channels
- Each loop must have a unique client ID
- Base ID + 1, 2, 3 for loops 2, 3, 4

Example: If base ID is `3120208700001`:
- Loop 1: `3120208700001`
- Loop 2: `3120208700002`
- Loop 3: `3120208700003`
- Loop 4: `3120208700004`

## MQTT Topic Naming

Meters send data to standard COMPERE topics. PowerFlow webhook listens for:

| Topic | Direction | Data Type |
|-------|-----------|-----------|
| MQTT_RT_DATA | ← | Real-time second-level (electrical parameters) |
| MQTT_ENY_NOW | ← | Energy consumption (minute-level)  |
| MQTT_DAY_DATA | ← | Daily frozen data |
| MQTT_TELEIND | ← | Digital inputs/outputs (DI/DO) |
| MQTT_TELECTRL_REP | ← | Remote control response |
| MQTT_METER_TIME_REP | ← | Time sync response |
| MQTT_SYS_SET_REP | ← | Parameter set response |
| MQTT_SYS_REPLY | ← | Parameter read response |
| MQTT_RECONFIG_REPLY | ← | MQTT reconfig response |
| MQTT_COMMOD_SET_REP | ← | Upload frequency set response |
| MQTT_COMMOD_READ_REP | ← | Upload frequency read response |
| MQTT_RECALL_REP | ← | Data recall response |

## Security Considerations

### 1. Enable TLS/SSL

For production, always use encrypted connections:

```
Port 8883 (MQTT with TLS)
Port 8084 (WebSocket with TLS)
```

### 2. Meter Authentication

Configure username/password for each meter:

```bash
# In EMQX:
emqx_ctl users add meter_001 password123
```

### 3. ACL (Access Control Lists)

Restrict meters to publish only to their own topics:

```
# ACL rule: Meter can only publish to MQTT_* topics
meter_*: subscribe, publish: MQTT_#
```

### 4. Rate Limiting

PowerFlow webhook already has basic input validation. Configure broker-side limits:

```
# EMQX settings
connection_rate_limit: 1000
message_rate_limit: 10000
```

### 5. Firewall Rules

- Only allow your MQTT broker IP to send webhooks to PowerFlow
- Or use API key authentication on the webhook

## Troubleshooting

### Meters Not Connecting

1. **Check broker logs:**
   ```bash
   docker logs emqx  # For EMQX
   ```

2. **Verify meter configuration:**
   - Correct broker IP/port
   - Correct username/password
   - Correct client ID (unique per meter)

3. **Test connectivity:**
   ```bash
   telnet broker.example.com 1883
   ```

### Data Not Appearing in PowerFlow

1. **Check webhook delivery:** In EMQX dashboard → Webhooks, check delivery status
2. **Check function logs:** `supabase functions logs mqtt-webhook --tail`
3. **Verify meter ID format:** Must be UUID in database for RLS to work
   - If meter ID is not UUID, update webhook to handle it differently
4. **Test webhook manually:**
   ```bash
   curl -X POST https://project.supabase.co/functions/v1/mqtt-webhook \
     -H "Content-Type: application/json" \
     -d '{
       "topic": "MQTT_RT_DATA",
       "payload": "{\"id\": \"test-meter\", ...}"
     }'
   ```

### High Latency

1. **Reduce upload frequency:** Meters don't need to send data every second
2. **Increase broker resources:** Ensure broker has sufficient CPU/RAM
3. **Use local mirror:** Deploy MQTT broker closer to meters (geographic proximity)

### Database Growing Too Large

1. **Archive old data:**
   ```sql
   -- Move 90+ day old readings to archive table
   INSERT INTO mqtt_meter_readings_archive
   SELECT * FROM mqtt_meter_readings
   WHERE received_at < now() - interval '90 days';
   
   DELETE FROM mqtt_meter_readings
   WHERE received_at < now() - interval '90 days';
   ```

2. **Set retention policy:** Configure automatic deletion/archival

## Next Steps

1. Deploy MQTT broker (EMQX recommended)
2. Configure webhook to PowerFlow
3. Configure meters with broker details
4. Test message delivery
5. Monitor `mqtt_meter_readings` table for incoming data
6. Use `MqttMeterDashboard` React component to display data
7. Set up archival strategy for long-term data retention

## Support

For issues:
- Check Supabase function logs
- Verify MQTT broker configuration
- Ensure firewall allows webhooks
- Contact MQTT broker support
