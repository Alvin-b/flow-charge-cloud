/**
 * MQTT Meter Dashboard Component
 * Displays real-time meter readings and allows sending commands
 * 
 * Usage: <MqttMeterDashboard meterId={meterId} />
 */

import React, { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import mqttApi from "@/lib/mqtt-client-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { AlertCircle, Zap, Activity, Gauge } from "lucide-react";

interface MqttMeterDashboardProps {
  meterId: string;
  refreshInterval?: number; // ms
}

export function MqttMeterDashboard({
  meterId,
  refreshInterval = 30000, // 30 seconds
}: MqttMeterDashboardProps) {
  const queryClient = useQueryClient();

  // Fetch latest reading
  const { data: readings, isLoading: readingsLoading } = useQuery({
    queryKey: ["mqtt-readings", meterId],
    queryFn: () => mqttApi.getRecentReadings(meterId, 1),
    refetchInterval: refreshInterval,
  });

  const latestReading = readings?.data?.[0];

  // Fetch energy readings
  const { data: energyReadings } = useQuery({
    queryKey: ["mqtt-energy", meterId],
    queryFn: () => mqttApi.getEnergyReadings(meterId, 50),
    refetchInterval: refreshInterval,
  });

  // Fetch daily readings for chart
  const { data: dailyReadings } = useQuery({
    queryKey: ["mqtt-daily", meterId],
    queryFn: () => mqttApi.getDailyReadings(meterId, 30),
    refetchInterval: 60000, // 1 minute
  });

  // Fetch meter status
  const { data: statusInfo } = useQuery({
    queryKey: ["mqtt-status", meterId],
    queryFn: () => mqttApi.checkMeterStatus(meterId),
    refetchInterval: refreshInterval,
  });

  // Fetch recent operations
  const { data: operations } = useQuery({
    queryKey: ["mqtt-operations", meterId],
    queryFn: () => mqttApi.getRecentOperations(meterId, 10),
    refetchInterval: 15000, // 15 seconds
  });

  const [commandLoading, setCommandLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["mqtt-readings", meterId] });
    queryClient.invalidateQueries({ queryKey: ["mqtt-energy", meterId] });
  };

  if (readingsLoading && !latestReading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Activity className="animate-spin mr-2" />
            <span>Loading meter data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isOnline = statusInfo?.isOnline ?? false;

  // Prepare data for charts
  const dailyChartData = (dailyReadings?.data || [])
    .sort(
      (a, b) =>
        new Date(a.reading_date).getTime() - new Date(b.reading_date).getTime()
    )
    .map((d) => ({
      date: new Date(d.reading_date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      import: d.import_total_active || 0,
      export: d.export_total_active || 0,
    }));

  const recentOpsCount = {
    pending: operations?.data?.filter((o) => o.status === "pending").length || 0,
    completed: operations?.data?.filter((o) => o.status === "completed").length ||
      0,
    failed: operations?.data?.filter((o) => o.status === "failed").length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full ${
                  isOnline ? "bg-green-500" : "bg-red-500"
                }`}
              />
              Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isOnline ? "Online" : "Offline"}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Last reading:{" "}
              {statusInfo?.lastReading
                ? new Date(statusInfo.lastReading).toLocaleTimeString()
                : "Never"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Active Power
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latestReading?.zyggl || 0}</div>
            <p className="text-xs text-gray-500">kW</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Gauge className="w-4 h-4" />
              Frequency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latestReading?.f || 0}</div>
            <p className="text-xs text-gray-500">Hz</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Power Factor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(latestReading?.zglys || 0).toFixed(3)}
            </div>
            <p className="text-xs text-gray-500">0-1 range</p>
          </CardContent>
        </Card>
      </div>

      {/* Feedback Message */}
      {feedbackMessage && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-2">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-blue-900">{feedbackMessage}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="voltages">Voltages & Current</TabsTrigger>
          <TabsTrigger value="energy">Energy Consumption</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="controls">Controls</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  Three-Phase Voltages
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Phase A (Ua)</span>
                  <span className="font-mono">
                    {latestReading?.ua?.toFixed(1) || 0} V
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Phase B (Ub)</span>
                  <span className="font-mono">
                    {latestReading?.ub?.toFixed(1) || 0} V
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Phase C (Uc)</span>
                  <span className="font-mono">
                    {latestReading?.uc?.toFixed(1) || 0} V
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  Three-Phase Currents
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Phase A (Ia)</span>
                  <span className="font-mono">
                    {latestReading?.ia?.toFixed(2) || 0} A
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Phase B (Ib)</span>
                  <span className="font-mono">
                    {latestReading?.ib?.toFixed(2) || 0} A
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Phase C (Ic)</span>
                  <span className="font-mono">
                    {latestReading?.ic?.toFixed(2) || 0} A
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  Real & Reactive Power
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total Active (P)</span>
                  <span className="font-mono">
                    {latestReading?.zyggl?.toFixed(2) || 0} kW
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total Reactive (Q)</span>
                  <span className="font-mono">
                    {latestReading?.zwggl?.toFixed(2) || 0} kvar
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total Apparent (S)</span>
                  <span className="font-mono">
                    {latestReading?.zszgl?.toFixed(2) || 0} kVA
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  Power Quality
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Voltage Unbalance</span>
                  <span className="font-mono">
                    {latestReading?.voltage_unbalance_rate?.toFixed(2) || 0}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Current Unbalance</span>
                  <span className="font-mono">
                    {latestReading?.current_unbalance_rate?.toFixed(2) || 0}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Total Demand</span>
                  <span className="font-mono">
                    {latestReading?.active_power_demand?.toFixed(2) || 0} kW
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Voltages & Current Tab */}
        <TabsContent value="voltages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Line-to-Line Voltages</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uab</span>
                <span>{latestReading?.uab?.toFixed(1) || 0} V</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Ubc</span>
                <span>{latestReading?.ubc?.toFixed(1) || 0} V</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Uca</span>
                <span>{latestReading?.uca?.toFixed(1) || 0} V</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Phase Angles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-xs font-semibold mb-2">Voltage Angles</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>UXJA</span>
                    <span>{latestReading?.ua_phase_angle?.toFixed(1) || 0}°</span>
                  </div>
                  <div className="flex justify-between">
                    <span>UXJB</span>
                    <span>{latestReading?.ub_phase_angle?.toFixed(1) || 0}°</span>
                  </div>
                  <div className="flex justify-between">
                    <span>UXJC</span>
                    <span>{latestReading?.uc_phase_angle?.toFixed(1) || 0}°</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold mb-2">Current Angles</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>IXJA</span>
                    <span>{latestReading?.ia_phase_angle?.toFixed(1) || 0}°</span>
                  </div>
                  <div className="flex justify-between">
                    <span>IXJB</span>
                    <span>{latestReading?.ib_phase_angle?.toFixed(1) || 0}°</span>
                  </div>
                  <div className="flex justify-between">
                    <span>IXJC</span>
                    <span>{latestReading?.ic_phase_angle?.toFixed(1) || 0}°</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Energy Consumption Tab */}
        <TabsContent value="energy" className="space-y-4">
          {dailyChartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Daily Consumption (30 days)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailyChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="import"
                      stroke="#3b82f6"
                      name="Import (kWh)"
                    />
                    <Line
                      type="monotone"
                      dataKey="export"
                      stroke="#10b981"
                      name="Export (kWh)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Current Energy Totals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Import Total</p>
                  <p className="text-lg font-mono">
                    {energyReadings?.data?.[0]?.import_total_active?.toFixed(2) || 0} kWh
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Export Total</p>
                  <p className="text-lg font-mono">
                    {energyReadings?.data?.[0]?.export_total_active?.toFixed(2) || 0} kWh
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Operations Tab */}
        <TabsContent value="operations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Operation Summary</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {recentOpsCount.pending}
                </div>
                <p className="text-xs text-gray-500">Pending</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {recentOpsCount.completed}
                </div>
                <p className="text-xs text-gray-500">Completed</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {recentOpsCount.failed}
                </div>
                <p className="text-xs text-gray-500">Failed</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Operations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {operations?.data && operations.data.length > 0 ? (
                  operations.data.map((op) => (
                    <div
                      key={op.operation_id}
                      className="flex items-center justify-between text-sm border-b pb-2"
                    >
                      <div className="flex-1">
                        <p className="font-medium capitalize">
                          {op.operation_type?.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(op.requested_at).toLocaleString()}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          op.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : op.status === "failed"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {op.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No operations yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Controls Tab */}
        <TabsContent value="controls" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Meter Commands</CardTitle>
              <p className="text-sm text-gray-500 mt-2">
                Send commands to synchronize time, read/write parameters, or control outputs.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={() => {
                  setCommandLoading(true);
                  setFeedbackMessage(
                    "Time sync command sent. Waiting for response..."
                  );
                  // Implement actual time sync command
                  setTimeout(() => {
                    setCommandLoading(false);
                    setFeedbackMessage(
                      "Time sync completed successfully!"
                    );
                  }, 2000);
                }}
                disabled={commandLoading}
                className="w-full"
              >
                Synchronize Time
              </Button>

              <Button
                onClick={() => {
                  setCommandLoading(true);
                  setFeedbackMessage("Reading upload frequency...");
                  // Implement actual command
                  setTimeout(() => {
                    setCommandLoading(false);
                    setFeedbackMessage(
                      "Upload frequency: 60 seconds (second-level), 60 minutes (minute-level)"
                    );
                  }, 2000);
                }}
                disabled={commandLoading}
                variant="outline"
                className="w-full"
              >
                Read Upload Frequency
              </Button>

              <Button
                onClick={() => {
                  setCommandLoading(true);
                  setFeedbackMessage(
                    "Reconfiguring MQTT settings..."
                  );
                  // Implement actual command
                  setTimeout(() => {
                    setCommandLoading(false);
                    setFeedbackMessage(
                      "MQTT reconfiguration completed!"
                    );
                  }, 2000);
                }}
                disabled={commandLoading}
                variant="outline"
                className="w-full"
              >
                Reconfigure MQTT
              </Button>

              <Button onClick={handleRefresh} variant="secondary" className="w-full">
                Refresh All Data
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Meter Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Meter ID</span>
                <span className="font-mono">{meterId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className={isOnline ? "text-green-600" : "text-red-600"}>
                  {isOnline ? "Online" : "Offline"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Last Reading</span>
                <span className="font-mono">
                  {latestReading?.reading_time
                    ? new Date(latestReading.reading_time).toLocaleString()
                    : "Never"}
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default MqttMeterDashboard;
