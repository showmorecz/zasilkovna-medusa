import { PacketaApiClient } from "../src/api-client"
import axios from "axios"

jest.mock("axios")

describe("PacketaApiClient", () => {
  let client: PacketaApiClient
  let mockAxiosInstance: jest.Mocked<typeof axios>

  beforeEach(() => {
    // Create a fresh mock for each test
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      delete: jest.fn(),
      create: jest.fn(),
    } as Partial<typeof axios>

    // Mock axios.create to return our mock instance
    (axios.create as jest.Mock).mockReturnValue(mockAxiosInstance)

    client = new PacketaApiClient({
      api_key: "test_key",
      api_url: "https://api.test.com",
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe("createShipment", () => {
    it("should create a shipment successfully", async () => {
      const mockResponse = {
        data: {
          id: "123",
          tracking_number: "TRACK123",
        },
      }
      mockAxiosInstance.post.mockResolvedValueOnce(mockResponse)

      const shipmentData = {
        pickup_point_id: "PP123",
        recipient: { name: "Test User" },
      }
      const result = await client.createShipment(shipmentData)

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/shipments', shipmentData)
      expect(result).toEqual(mockResponse.data)
    })

    it("should handle API errors", async () => {
      const axiosError = new Error("API Error") as Error & { 
        isAxiosError: boolean;
        response?: {
          data: { message: string };
          status: number;
          statusText: string;
          headers: Record<string, unknown>;
          config: Record<string, unknown>;
        };
      };
      axiosError.isAxiosError = true;
      axiosError.response = {
        data: { message: "API Error" },
        status: 400,
        statusText: "Bad Request",
        headers: {},
        config: {}
      };
      mockAxiosInstance.post.mockRejectedValueOnce(axiosError)

      await expect(
        client.createShipment({
          pickup_point_id: "PP123",
          recipient: { name: "Test User" },
        })
      ).rejects.toThrow("Packeta API Error: API Error")
    })
  })

  describe("getShipmentLabel", () => {
    it("should retrieve PDF label successfully", async () => {
      const mockResponse = {
        data: {
          label: "base64_encoded_pdf",
        },
      }
      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse)

      const result = await client.getShipmentLabel("123")

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/shipments/123/label')
      expect(result).toBe(mockResponse.data.label)
    })
  })

  describe("getShipmentTracking", () => {
    it("should retrieve tracking information successfully", async () => {
      const mockResponse = {
        data: {
          status: "delivered",
          history: [],
        },
      }
      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse)

      const result = await client.getShipmentTracking("TRACK123")

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/shipments/TRACK123/tracking')
      expect(result).toEqual(mockResponse.data)
    })
  })

  describe("getPickupPoints", () => {
    it("should retrieve pickup points successfully", async () => {
      const mockResponse = {
        data: [
          {
            id: "PP1",
            name: "Pickup Point 1",
            address: {
              street: "Test Street 1",
              city: "Test City",
            },
          },
        ],
      }
      mockAxiosInstance.get.mockResolvedValueOnce(mockResponse)

      const result = await client.getPickupPoints()

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/pickup-points')
      expect(result).toEqual(mockResponse.data)
    })
  })
})
