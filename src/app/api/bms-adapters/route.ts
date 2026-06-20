import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'


export async function GET() {
  const adapters = [
    {
      id: 'rest-01',
      name: 'REST API Adapter',
      protocol: 'REST',
      vendor: 'Siemens Desigo',
      model: 'PXC100',
      status: 'CONNECTED',
      roomsManaged: 8,
      lastSync: new Date(Date.now() - 2000).toISOString(),
      latency: 12,
      endpoint: 'http://localhost:3004',
      capabilities: ['read_temp', 'write_setpoint', 'read_load', 'confirm_setpoint', 'door_control', 'fault_inject'],
      color: '#10b981',
    },
    {
      id: 'bacnet-01',
      name: 'BACnet/IP Adapter',
      protocol: 'BACnet/IP',
      vendor: 'Honeywell EBI',
      model: 'ComfortPoint',
      status: 'SIMULATED',
      roomsManaged: 0,
      lastSync: new Date(Date.now() - 30000).toISOString(),
      latency: 45,
      endpoint: 'bacnet://192.168.1.100:47808',
      capabilities: ['read_temp', 'write_setpoint', 'read_load', 'confirm_setpoint'],
      color: '#0ea5e9',
      note: 'Stub adapter — ready for production deployment with node-bacnet library',
    },
    {
      id: 'modbus-01',
      name: 'Modbus TCP Adapter',
      protocol: 'Modbus TCP',
      vendor: 'Schneider EcoStruxure',
      model: 'AS-P',
      status: 'SIMULATED',
      roomsManaged: 0,
      lastSync: new Date(Date.now() - 60000).toISOString(),
      latency: 78,
      endpoint: 'modbus://192.168.1.101:502',
      capabilities: ['read_temp', 'write_setpoint', 'read_load'],
      color: '#f59e0b',
      note: 'Stub adapter — ready for production deployment with modbus-serial library',
    },
    {
      id: 'mqtt-01',
      name: 'MQTT IoT Gateway',
      protocol: 'MQTT',
      vendor: 'Generic IoT',
      model: 'Mosquitto/HiveMQ',
      status: 'AVAILABLE',
      roomsManaged: 0,
      lastSync: null,
      latency: 0,
      endpoint: 'mqtt://broker.coldops.local:1883',
      capabilities: ['read_temp', 'read_load', 'event_subscribe'],
      color: '#8b5cf6',
      note: 'Available for factories with IoT gateways pushing meter data',
    },
  ]

  const stats = {
    total: adapters.length,
    connected: adapters.filter(a => a.status === 'CONNECTED').length,
    simulated: adapters.filter(a => a.status === 'SIMULATED').length,
    available: adapters.filter(a => a.status === 'AVAILABLE').length,
    totalRoomsManaged: adapters.reduce((s, a) => s + a.roomsManaged, 0),
    avgLatency: Math.round(adapters.filter(a => a.latency > 0).reduce((s, a) => s + a.latency, 0) / adapters.filter(a => a.latency > 0).length),
  }

  const protocolSupport = [
    { protocol: 'REST API', library: 'fetch (built-in)', vendors: ['Siemens Desigo', 'Honeywell EBI', 'Schneider EcoStruxure', 'Johnson Controls Metasys'], maturity: 'Production' },
    { protocol: 'BACnet/IP', library: 'node-bacnet', vendors: ['Siemens', 'Honeywell', 'Schneider'], maturity: 'Adapter Ready' },
    { protocol: 'Modbus TCP', library: 'modbus-serial', vendors: ['Legacy PLCs', 'Schneider'], maturity: 'Adapter Ready' },
    { protocol: 'MQTT', library: 'mqtt.js', vendors: ['IoT Gateways', 'Custom'], maturity: 'Available' },
  ]

  return NextResponse.json({ adapters, stats, protocolSupport })
}
