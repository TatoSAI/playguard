import { useState, useEffect } from 'react'
import {
  Smartphone,
  Wifi,
  RefreshCw,
  Circle,
  PlayCircle,
  AlertCircle,
  CheckCircle2
} from 'lucide-react'

interface DeviceInfo {
  id: string
  model: string
  manufacturer: string
  androidVersion: string
  resolution: string
  isConnected: boolean
}

export default function DeviceManager(): JSX.Element {
  const [devices, setDevices] = useState<DeviceInfo[]>([])
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    loadDevices()
  }, [])

  const loadDevices = async (): Promise<void> => {
    setIsLoading(true)
    try {
      const deviceList = await window.api.adb.getDevices()
      setDevices(deviceList)

      if (deviceList.length > 0 && !selectedDevice) {
        setSelectedDevice(deviceList[0].id)
      }
    } catch (error) {
      console.error('Failed to load devices:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const refreshDevices = async (): Promise<void> => {
    setIsRefreshing(true)
    await loadDevices()
    setTimeout(() => setIsRefreshing(false), 500)
  }

  const connectDevice = async (deviceId: string): Promise<void> => {
    try {
      await window.api.adb.connect(deviceId)
      setSelectedDevice(deviceId)
      await loadDevices()
    } catch (error) {
      console.error('Failed to connect device:', error)
    }
  }

  return (
    <div className="h-full flex">
      {/* Device List Sidebar */}
      <div className="w-80 border-r border-border bg-card flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Devices</h2>
            <button
              onClick={refreshDevices}
              disabled={isRefreshing}
              className="p-2 rounded-lg hover:bg-accent transition-colors"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
              />
            </button>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 text-sm text-muted-foreground">
            <Wifi className="w-4 h-4" />
            <span>Connected via USB/ADB</span>
          </div>
        </div>

        {/* Device List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Scanning for devices...</p>
              </div>
            </div>
          ) : devices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="w-12 h-12 text-muted-foreground mb-3" />
              <h3 className="font-medium text-foreground mb-2">No Devices Found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Connect your Android device via USB and enable USB debugging
              </p>
              <button
                onClick={refreshDevices}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
              >
                Scan Again
              </button>
            </div>
          ) : (
            devices.map((device) => (
              <button
                key={device.id}
                onClick={() => connectDevice(device.id)}
                className={`
                  w-full p-4 rounded-lg border text-left transition-all
                  ${
                    selectedDevice === device.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-card hover:bg-accent'
                  }
                `}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium text-foreground">
                      {device.model}
                    </span>
                  </div>
                  {device.isConnected && (
                    <Circle className="w-2 h-2 fill-green-500 text-green-500" />
                  )}
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>{device.manufacturer}</p>
                  <p>Android {device.androidVersion}</p>
                  <p className="font-mono">{device.id}</p>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        {devices.length > 0 && (
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span>{devices.length} device(s) connected</span>
            </div>
          </div>
        )}
      </div>

      {/* Device Details / Actions */}
      <div className="flex-1 flex items-center justify-center p-8">
        {selectedDevice ? (
          <DeviceDetails
            device={devices.find((d) => d.id === selectedDevice)!}
          />
        ) : (
          <div className="text-center">
            <Smartphone className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              No Device Selected
            </h3>
            <p className="text-sm text-muted-foreground">
              Select a device from the list to get started
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

interface DeviceDetailsProps {
  device: DeviceInfo
}

function DeviceDetails({ device }: DeviceDetailsProps): JSX.Element {
  return (
    <div className="w-full max-w-2xl space-y-6">
      {/* Device Info Card */}
      <div className="p-6 rounded-lg border border-border bg-card">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Device Information
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <InfoItem label="Model" value={device.model} />
          <InfoItem label="Manufacturer" value={device.manufacturer} />
          <InfoItem label="Android Version" value={device.androidVersion} />
          <InfoItem label="Resolution" value={device.resolution} />
          <InfoItem label="Device ID" value={device.id} mono />
          <InfoItem
            label="Status"
            value={
              <span className="flex items-center gap-2 text-green-500">
                <Circle className="w-2 h-2 fill-current" />
                Connected
              </span>
            }
          />
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-500">
        <CheckCircle2 className="w-5 h-5" />
        <span className="text-sm font-medium">
          Device ready for testing
        </span>
      </div>
    </div>
  )
}

interface InfoItemProps {
  label: string
  value: React.ReactNode
  mono?: boolean
}

function InfoItem({ label, value, mono }: InfoItemProps): JSX.Element {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-sm text-foreground ${mono ? 'font-mono' : ''}`}>
        {value}
      </p>
    </div>
  )
}

