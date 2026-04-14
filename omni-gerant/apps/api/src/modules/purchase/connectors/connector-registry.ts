import type { ConnectorBase } from './connector-base.js';

// BUSINESS RULE [CDC-2.2]: Registre des connecteurs disponibles

const connectors = new Map<string, ConnectorBase>();

export function registerConnector(connector: ConnectorBase): void {
  connectors.set(connector.type, connector);
}

export function getConnector(type: string): ConnectorBase | undefined {
  return connectors.get(type);
}

export function listConnectors(): ConnectorBase[] {
  return [...connectors.values()];
}

export function hasConnector(type: string): boolean {
  return connectors.has(type);
}

export interface ConnectorInfo {
  type: string;
  displayName: string;
  description: string;
}

export function listConnectorInfo(): ConnectorInfo[] {
  return listConnectors().map((c) => ({
    type: c.type,
    displayName: c.displayName,
    description: c.description,
  }));
}
