// Middle East / MENA regional intelligence variant
import type { PanelConfig, MapLayers } from '@/types';
import type { VariantConfig } from './base';

export * from './base';

/** Panels intentionally reuse existing World Monitor capabilities first. */
export const DEFAULT_PANELS: Record<string, PanelConfig> = {
  map: { name: 'MENA Intelligence Map', enabled: true, priority: 1 },
  'live-news': { name: 'MENA Live News', enabled: true, priority: 1 },
  insights: { name: 'AI Regional Insights', enabled: true, priority: 1 },
  'threat-timeline': { name: 'Regional Event Timeline', enabled: true, priority: 1 },
  'mena-situation-overview': { name: 'MENA Situation Overview', enabled: true, priority: 1 },
  'mena-country-monitor': { name: 'MENA Country Monitor', enabled: true, priority: 1 },
  'mena-country-intelligence': { name: 'MENA Country Intelligence', enabled: true, priority: 1 },
  'mena-event-map': { name: 'MENA Event Map', enabled: true, priority: 1 },
  'mena-event-intelligence': { name: 'MENA Event Intelligence', enabled: true, priority: 1 },
  'mena-event-detail': { name: 'MENA Intelligence Evidence', enabled: true, priority: 1 },
  'mena-correlation': { name: 'MENA Event Correlation', enabled: true, priority: 1 },
  'mena-entity-monitor': { name: 'MENA Entity Monitor', enabled: true, priority: 1 },
  'mena-historical-intelligence': { name: 'Historical MENA Intelligence', enabled: true, priority: 1 },
  'mena-operational-activity': { name: 'MENA Operational Activity', enabled: true, priority: 1 },
  'mena-cross-domain': { name: 'MENA Cross-Domain Correlation', enabled: true, priority: 1 },
  'strategic-posture': { name: 'Regional Strategic Posture', enabled: true, priority: 1 },
  intel: { name: 'MENA Intelligence Feed', enabled: true, priority: 1 },
  'gdelt-intel': { name: 'Live Regional Intelligence', enabled: true, priority: 1 },
  cii: { name: 'Regional Stability Indicators', enabled: true, priority: 1 },
  'strategic-risk': { name: 'Regional Risk Overview', enabled: true, priority: 1 },
  cascade: { name: 'Infrastructure Cascade', enabled: true, priority: 1 },
  'military-correlation': { name: 'Military Activity', enabled: true, priority: 1 },
  'escalation-correlation': { name: 'Escalation Monitor', enabled: true, priority: 1 },
  'economic-correlation': { name: 'Economic Impact Signals', enabled: true, priority: 1 },
  'disaster-correlation': { name: 'Regional Disaster Signals', enabled: true, priority: 2 },
  middleeast: { name: 'MENA Regional News', enabled: true, priority: 1 },
  'ucdp-events': { name: 'Conflict Events', enabled: true, priority: 1 },
  displacement: { name: 'Displacement & Humanitarian', enabled: true, priority: 2 },
  'security-advisories': { name: 'Security Advisories', enabled: true, priority: 2 },
  'sanctions-pressure': { name: 'Sanctions & Trade Pressure', enabled: true, priority: 2 },
  'airline-intel': { name: 'Aviation Intelligence', enabled: true, priority: 1 },
  'telegram-intel': { name: 'Telegram Intelligence', enabled: true, priority: 2 },
  'x-intel': { name: 'Open Social Intelligence', enabled: true, priority: 2 },
  'hormuz-tracker': { name: 'Maritime Chokepoints', enabled: true, priority: 1 },
  'energy-risk-overview': { name: 'Regional Energy Risk', enabled: true, priority: 1 },
  'energy-complex': { name: 'MENA Energy Complex', enabled: true, priority: 1 },
  'oil-inventories': { name: 'Oil & Gas Inventories', enabled: true, priority: 2 },
  'supply-chain': { name: 'Regional Supply Chains', enabled: true, priority: 1 },
  commodities: { name: 'Commodities', enabled: true, priority: 2 },
  economic: { name: 'Regional Economy', enabled: true, priority: 2 },
  'gulf-economies': { name: 'Gulf Economies', enabled: true, priority: 2 },
  climate: { name: 'Climate & Weather', enabled: true, priority: 2 },
  monitors: { name: 'My Monitors', enabled: true, priority: 3 },
};

/** Regional view: maximize security, transport, energy and infrastructure signals. */
export const DEFAULT_MAP_LAYERS: MapLayers = {
  gpsJamming: true, satellites: false, conflicts: true, bases: true, cables: true,
  pipelines: true, hotspots: true, ais: true, nuclear: true, irradiators: false,
  sanctions: true, weather: true, canadaRoads: false, canadaAlerts: false, economic: true,
  waterways: true, outages: true, cyberThreats: true, datacenters: false, protests: true,
  flights: true, military: true, natural: true, spaceports: false, minerals: true,
  fires: true, ucdpEvents: true, displacement: true, climate: true,
  startupHubs: false, cloudRegions: false, accelerators: false, techHQs: false, techEvents: false,
  stockExchanges: true, financialCenters: true, centralBanks: true, commodityHubs: true,
  gulfInvestments: true, positiveEvents: false, kindness: false, happiness: false,
  speciesRecovery: false, renewableInstallations: true, tradeRoutes: true, iranAttacks: false,
  ciiChoropleth: true, resilienceScore: true, dayNight: false, miningSites: false,
  processingPlants: false, commodityPorts: true, webcams: false, diseaseOutbreaks: true,
  storageFacilities: true, fuelShortages: true, liveTankers: true, menaEvents: true, menaEntities: true,
};

export const MOBILE_DEFAULT_MAP_LAYERS: MapLayers = {
  gpsJamming: false, satellites: false, conflicts: true, bases: false, cables: false,
  pipelines: true, hotspots: true, ais: false, nuclear: false, irradiators: false,
  sanctions: true, weather: true, canadaRoads: false, canadaAlerts: false, economic: false,
  waterways: true, outages: true, cyberThreats: false, datacenters: false, protests: false,
  flights: false, military: false, natural: true, spaceports: false, minerals: false,
  fires: false, ucdpEvents: true, displacement: true, climate: false,
  startupHubs: false, cloudRegions: false, accelerators: false, techHQs: false, techEvents: false,
  stockExchanges: false, financialCenters: false, centralBanks: false, commodityHubs: false,
  gulfInvestments: false, positiveEvents: false, kindness: false, happiness: false,
  speciesRecovery: false, renewableInstallations: false, tradeRoutes: false, iranAttacks: false,
  ciiChoropleth: false, resilienceScore: false, dayNight: false, miningSites: false,
  processingPlants: false, commodityPorts: true, webcams: false, diseaseOutbreaks: false,
  storageFacilities: false, fuelShortages: false, liveTankers: false,
};

export const VARIANT_CONFIG: VariantConfig = {
  name: 'mena',
  description: 'Middle East regional intelligence and situation awareness dashboard',
  panels: DEFAULT_PANELS,
  mapLayers: DEFAULT_MAP_LAYERS,
  mobileMapLayers: MOBILE_DEFAULT_MAP_LAYERS,
};
