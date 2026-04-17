import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerConnector,
  getConnector,
  listConnectors,
  hasConnector,
  listConnectorInfo,
} from '../connector-registry.js';
import type { ConnectorBase } from '../connector-base.js';
import { ok } from '@zenadmin/shared';

const mockConnector: ConnectorBase = {
  type: 'test',
  displayName: 'Test Connector',
  description: 'A test connector',
  authenticate: async () => ok({ token: 'test' }),
  fetchInvoices: async () => ok([]),
  downloadDocument: async () => ok(Buffer.from('test')),
};

describe('ConnectorRegistry', () => {
  it('registers and retrieves a connector', () => {
    registerConnector(mockConnector);

    const connector = getConnector('test');
    expect(connector).toBeDefined();
    expect(connector?.type).toBe('test');
  });

  it('returns undefined for unknown connector', () => {
    const connector = getConnector('nonexistent');
    expect(connector).toBeUndefined();
  });

  it('checks if connector exists', () => {
    registerConnector(mockConnector);

    expect(hasConnector('test')).toBe(true);
    expect(hasConnector('nonexistent')).toBe(false);
  });

  it('lists all registered connectors', () => {
    registerConnector(mockConnector);

    const connectors = listConnectors();
    expect(connectors.length).toBeGreaterThanOrEqual(1);
    expect(connectors.some((c) => c.type === 'test')).toBe(true);
  });

  it('lists connector info', () => {
    registerConnector(mockConnector);

    const info = listConnectorInfo();
    const testInfo = info.find((i) => i.type === 'test');
    expect(testInfo).toBeDefined();
    expect(testInfo?.displayName).toBe('Test Connector');
    expect(testInfo?.description).toBe('A test connector');
  });
});
