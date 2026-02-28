import { describe, it, expect, vi, beforeEach } from "vitest";
import { mpesaApi, meterApi, transferApi, consumptionApi } from "./api";

// Mock supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() =>
        Promise.resolve({
          data: { session: { access_token: "mock-token" } },
        })
      ),
    },
  },
}));

// Mock fetch
global.fetch = vi.fn();

describe("mpesaApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initiateSTKPush", () => {
    it("should initiate STK push successfully", async () => {
      const mockResponse = {
        success: true,
        transaction_id: "tx-123",
        checkout_request_id: "checkout-123",
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await mpesaApi.initiateSTKPush("0712345678", 100);

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/functions/v1/mpesa-payment"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer mock-token",
          }),
          body: JSON.stringify({ phone: "0712345678", amount_kes: 100 }),
        })
      );
    });

    it("should throw error on failed STK push", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Payment failed" }),
      });

      await expect(
        mpesaApi.initiateSTKPush("0712345678", 100)
      ).rejects.toThrow("Payment failed");
    });
  });

  describe("checkStatus", () => {
    it("should check transaction status", async () => {
      const mockStatus = {
        transaction_id: "tx-123",
        status: "completed",
        amount_kwh: 4.17,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatus,
      });

      const result = await mpesaApi.checkStatus("tx-123");

      expect(result).toEqual(mockStatus);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/functions/v1/mpesa-payment"),
        expect.objectContaining({
          method: "GET",
        })
      );
    });
  });
});

describe("meterApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("connect", () => {
    it("should connect to a meter", async () => {
      const mockResponse = {
        success: true,
        connection: { id: "conn-123" },
        meter: { id: "meter-456", meter_code: "MTR001" },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await meterApi.connect("MTR001");

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/functions/v1/meter-connect"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ meter_code: "MTR001", connection_type: "manual_code" }),
        })
      );
    });
  });

  describe("disconnect", () => {
    it("should disconnect from a meter", async () => {
      const mockResponse = { success: true };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await meterApi.disconnect("conn-123");

      expect(result).toEqual(mockResponse);
    });
  });

  describe("getActiveConnection", () => {
    it("should get active connection", async () => {
      const mockConnection = {
        connection: {
          connection_id: "conn-123",
          meter_code: "MTR001",
          meter_name: "Kitchen Meter",
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockConnection,
      });

      const result = await meterApi.getActiveConnection();

      expect(result).toEqual(mockConnection);
    });
  });
});

describe("transferApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("send", () => {
    it("should send energy transfer", async () => {
      const mockResponse = {
        success: true,
        transaction_id: "tx-123",
        amount_kwh: 5.0,
        new_balance: 15.5,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await transferApi.send("0712345678", 5.0);

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/functions/v1/p2p-transfer"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ recipient_phone: "0712345678", amount_kwh: 5.0 }),
        })
      );
    });

    it("should throw error on failed transfer", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Insufficient balance" }),
      });

      await expect(transferApi.send("0712345678", 5.0)).rejects.toThrow(
        "Insufficient balance"
      );
    });
  });

  describe("getDailyUsage", () => {
    it("should get daily transfer usage", async () => {
      const mockUsage = {
        used_today: 10.5,
        daily_limit: 50.0,
        remaining: 39.5,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUsage,
      });

      const result = await transferApi.getDailyUsage();

      expect(result).toEqual(mockUsage);
    });
  });
});

describe("consumptionApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getDaily", () => {
    it("should get daily consumption data", async () => {
      const mockData = [
        { day: "Mon", date: "2026-02-24", kwh: 7.2 },
        { day: "Tue", date: "2026-02-25", kwh: 6.8 },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockData }),
      });

      const result = await consumptionApi.getDaily();

      expect(result).toEqual(mockData);
    });
  });

  describe("getSummary", () => {
    it("should get consumption summary", async () => {
      const mockSummary = {
        this_month: 150.5,
        last_month: 140.2,
        week_total: 50.4,
        daily_avg: 7.2,
        change_percent: 7,
        peak_hour: "6 PM",
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSummary,
      });

      const result = await consumptionApi.getSummary();

      expect(result).toEqual(mockSummary);
    });
  });
});
