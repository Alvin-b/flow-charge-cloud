# MQTT Integration Setup Guide

## Overview
The PowerFlow system uses MQTT (Message Queuing Telemetry Transport) protocol for real-time communication with 4G smart meters.

---

## MQTT Broker Configuration

### Environment Variables
Add these to your Supabase edge function secrets:

```bash
# MQTT Broker URL (UPDATE WITH YOUR BROKER)
MQTT_BROKER_URL=mqtt://broker.hivemq.com:1883

# MQTT Credentials (if required by your broker)
MQTT_USERNAME=your_username
MQTT_PASSWORD=your_password

# Client ID (optional, auto-generated if not provided)
MQTT_CLIENT_ID=powerflow-server
```

### Setting Secrets in Supabase
```bash
# Set each secret
supabase secrets set MQTT_BROKER_URL=mqtt://your-broker.com:1883
supabase secrets set MQTT_USERNAME=your_username
supabase secrets set MQTT_PASSWORD=your_password
```

---

## MQTT Topics Structure

### Standard Topic Format
```
meters/{meter_id}/{message_type}
```

### Topic Types

#### 1. **Status** (Meter → Server)
**Topic**: `meters/{meter_id}/status`

**Payload** (JSON):
```json
{
  "online": true,
  "voltage": 230.5,
  "current": 5.2,
  "power": 1.2,
  "temperature": 35.5,
  "timestamp": "2026-02-28T21:00:00Z"
}
```

#### 2. **Consumption** (Meter → Server)
**Topic**: `meters/{meter_id}/consumption`

**Payload** (JSON):
```json
{
  "kwh_consumed": 0.15,
  "power_draw_kw": 1.2,
  "timestamp": "2026-02-28T21:05:00Z"
}
```

#### 3. **Command** (Server → Meter)
**Topic**: `meters/{meter_id}/command`

**Payload** (JSON):
```json
{
  "command": "connect_user|disconnect_user|set_balance|get_status",
  "payload": {
    "user_id": "uuid",
    "balance_kwh": 25.5,
    "connected_at": "2026-02-28T21:00:00Z"
  },
  "timestamp": "2026-02-28T21:00:00Z"
}
```

#### 4. **Response** (Meter → Server)
**Topic**: `meters/{meter_id}/response`

**Payload** (JSON):
```json
{
  "command": "connect_user",
  "success": true,
  "message": "User connected successfully",
  "data": {
    "balance_kwh": 25.5
  },
  "timestamp": "2026-02-28T21:00:05Z"
}
```

#### 5. **Alert** (Meter → Server)
**Topic**: `meters/{meter_id}/alert`

**Payload** (JSON):
```json
{
  "alert_type": "overload|fault|tamper|low_voltage",
  "severity": "warning|critical",
  "message": "Overload detected: 15A exceeded",
  "timestamp": "2026-02-28T21:00:00Z"
}
```

---

## Edge Functions

### 1. `mqtt-meter`
**Purpose**: Send commands to meters and get responses

**Actions**:
- `device_info` - Get meter information
- `device_status` - Get real-time status via MQTT
- `sync_connection` - Send connect command to meter
- `sync_disconnection` - Send disconnect command to meter
- `update_balance` - Update meter balance

**Example Usage**:
```typescript
// Get meter status via MQTT
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/mqtt-meter?action=device_status`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ meter_id: "abc-123" }),
  }
);
```

### 2. `mqtt-webhook`
**Purpose**: Receive meter data pushes from MQTT broker

**How it works**:
1. Configure your MQTT broker to forward messages to this webhook
2. Broker sends HTTP POST with topic and payload
3. Webhook processes meter data and updates database

**Webhook URL**:
```
https://your-project.supabase.co/functions/v1/mqtt-webhook
```

**Expected payload from broker**:
```json
{
  "topic": "meters/abc-123/status",
  "payload": "{\"online\": true, \"voltage\": 230.5}",
  "qos": 1,
  "timestamp": 1234567890
}
```

---

## MQTT Broker Setup

### Option 1: Cloud MQTT Brokers

#### HiveMQ Cloud (Free Tier)
1. Sign up at https://www.hivemq.com/mqtt-cloud-broker/
2. Create a cluster
3. Note: host, port, username, password
4. Update environment variables

#### AWS IoT Core
1. Create Thing in AWS IoT console
2. Create certificates
3. Configure topic rules to forward to API Gateway → Supabase webhook

#### EMQX Cloud
1. Sign up at https://www.emqx.com/en/cloud
2. Create deployment
3. Configure webhook rule to forward to Supabase

### Option 2: Self-Hosted (Mosquitto)

#### Install Mosquitto
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install mosquitto mosquitto-clients

# Start service
sudo systemctl start mosquitto
sudo systemctl enable mosquitto
```

#### Configure Webhook Bridge
Edit `/etc/mosquitto/mosquitto.conf`:
```conf
# Enable webhooks
connection webhook_bridge
address your-supabase-url.supabase.co:443
topic meters/# out 0
remote_username your_webhook_token
remote_password ""
bridge_protocol_version mqttv311
try_private false
cleansession true
notifications false
```

---

## Meter Firmware Requirements

Your 4G meters should:

1. **Connect to MQTT broker on startup**
   - Use credentials from configuration
   - Subscribe to command topic: `meters/{meter_id}/command`

2. **Publish status periodically** (every 30-60 seconds)
   - Topic: `meters/{meter_id}/status`
   - Include: online, voltage, current, power, temperature

3. **Publish consumption data** (every 5 minutes or on threshold)
   - Topic: `meters/{meter_id}/consumption`
   - Include: kwh_consumed, power_draw_kw, timestamp

4. **Listen for commands**
   - Subscribe: `meters/{meter_id}/command`
   - Process: connect_user, disconnect_user, set_balance, get_status
   - Publish response: `meters/{meter_id}/response`

5. **Send alerts when needed**
   - Topic: `meters/{meter_id}/alert`
   - Types: overload, fault, tamper, low_voltage

---

## Testing MQTT Integration

### Using MQTT Explorer (GUI)
1. Download: https://mqtt-explorer.com/
2. Connect to your broker
3. Subscribe to `meters/#`
4. Publish test messages

### Using mosquitto_pub/sub (CLI)
```bash
# Subscribe to all meter topics
mosquitto_sub -h broker.hivemq.com -t "meters/#"

# Publish test status
mosquitto_pub -h broker.hivemq.com -t "meters/test-meter-123/status" \
  -m '{"online": true, "voltage": 230, "current": 5, "power": 1.2}'

# Publish test consumption
mosquitto_pub -h broker.hivemq.com -t "meters/test-meter-123/consumption" \
  -m '{"kwh_consumed": 0.15, "power_draw_kw": 1.2, "timestamp": "2026-02-28T21:05:00Z"}'
```

---

## Integration with Existing System

### Updating meter-connect Function

The `meter-connect` function now calls `mqtt-meter` to sync with physical device:

```typescript
// After creating connection in database
await fetch(`${SUPABASE_URL}/functions/v1/mqtt-meter?action=sync_connection`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ connection_id: newConnection.id }),
});
```

### Real-time Balance Updates

When wallet balance changes (recharge, consumption), update meter:

```typescript
// After wallet update
await fetch(`${SUPABASE_URL}/functions/v1/mqtt-meter?action=update_balance`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    meter_id: activeMeter.id,
    balance_kwh: newWalletBalance,
  }),
});
```

---

## Deployment

### 1. Deploy Edge Functions
```bash
supabase functions deploy mqtt-meter
supabase functions deploy mqtt-webhook
```

### 2. Set Environment Variables
```bash
supabase secrets set MQTT_BROKER_URL=mqtt://your-broker.com:1883
supabase secrets set MQTT_USERNAME=your_username
supabase secrets set MQTT_PASSWORD=your_password
```

### 3. Configure MQTT Broker Webhook
Point your broker's webhook to:
```
https://your-project.supabase.co/functions/v1/mqtt-webhook
```

### 4. Test Connection
```bash
# View logs
supabase functions logs mqtt-meter --tail
supabase functions logs mqtt-webhook --tail
```

---

## Security Considerations

1. **Use TLS/SSL**: Switch from `mqtt://` to `mqtts://` (port 8883)
2. **Authentication**: Always use username/password or client certificates
3. **Authorization**: Configure broker ACLs to limit topic access per meter
4. **Webhook Security**: Verify webhook requests (signature, IP whitelist)
5. **Rate Limiting**: Prevent meters from flooding broker with messages

---

## Troubleshooting

### Meters not connecting
- Check MQTT broker credentials
- Verify broker is accessible from meters' network
- Check firewall rules (port 1883/8883)

### Webhook not receiving data
- Verify broker webhook configuration
- Check Supabase function logs
- Test webhook endpoint manually with curl

### Commands not reaching meters
- Verify meter is subscribed to command topic
- Check QoS settings (use QoS 1 for guaranteed delivery)
- View MQTT broker logs

---

## Migration from Tuya

The old `tuya-meter` function remains available but is no longer used for core functionality. All meter operations now go through MQTT:

| Old (Tuya) | New (MQTT) |
|------------|------------|
| `tuya-meter?action=device_info` | `mqtt-meter?action=device_info` |
| `tuya-meter?action=device_status` | `mqtt-meter?action=device_status` |
| `tuya-meter?action=link_meter` | Use `meter-connect` (handles MQTT sync) |

---

## Support

For MQTT integration issues, check:
1. Supabase function logs
2. MQTT broker logs
3. Meter firmware logs
4. Network connectivity between components

**Version**: 1.0.0  
**Last Updated**: February 2026
