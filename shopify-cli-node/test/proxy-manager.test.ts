import { expect } from 'chai';

import { ProxyManager } from '../src/proxy/proxy-manager';

describe('ProxyManager', () => {
  let proxyManager: ProxyManager;

  beforeEach(() => {
    proxyManager = new ProxyManager();
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      const config = proxyManager.getConfig();
      expect(config.host).to.equal('us.decodo.com');
      expect(config.portRange.start).to.equal(10_001);
      expect(config.portRange.end).to.equal(10_010);
      expect(config.maxRetries).to.equal(3);
      expect(config.retryDelay).to.equal(1000);
    });

    it('should accept custom config', () => {
      const customManager = new ProxyManager({
        host: 'custom.example.com',
        maxRetries: 5,
        retryDelay: 2000
      });

      const config = customManager.getConfig();
      expect(config.host).to.equal('custom.example.com');
      expect(config.maxRetries).to.equal(5);
      expect(config.retryDelay).to.equal(2000);
      // Should keep defaults for other values
      expect(config.portRange.start).to.equal(10_001);
      expect(config.portRange.end).to.equal(10_010);
    });
  });

  describe('getNextProxy', () => {
    it('should return a proxy info object', () => {
      const proxy = proxyManager.getNextProxy();
      expect(proxy).to.have.property('host');
      expect(proxy).to.have.property('port');
      expect(proxy).to.have.property('agent');
      expect(proxy).to.have.property('lastUsed');
      expect(proxy).to.have.property('failureCount');
    });

    it('should rotate through different ports', () => {
      const proxy1 = proxyManager.getNextProxy();
      const proxy2 = proxyManager.getNextProxy();
      
      expect(proxy1.port).to.not.equal(proxy2.port);
      expect(proxy1.port).to.be.at.least(10_001);
      expect(proxy1.port).to.be.at.most(10_010);
      expect(proxy2.port).to.be.at.least(10_001);
      expect(proxy2.port).to.be.at.most(10_010);
    });

    it('should prefer unused ports', () => {
      const usedPorts = new Set<number>();
      
      // Get proxies for all available ports
      for (let i = 0; i < 10; i++) {
        const proxy = proxyManager.getNextProxy();
        expect(usedPorts.has(proxy.port)).to.be.false;
        usedPorts.add(proxy.port);
      }
      
      expect(usedPorts.size).to.equal(10);
    });

    it('should reset and reuse ports after all are used', () => {
      // Use all ports once
      const firstRound = [];
      for (let i = 0; i < 10; i++) {
        firstRound.push(proxyManager.getNextProxy().port);
      }

      // Get another proxy - should start reusing
      const nextProxy = proxyManager.getNextProxy();
      expect(nextProxy.port).to.be.at.least(10_001);
      expect(nextProxy.port).to.be.at.most(10_010);
    });
  });

  describe('proxy health management', () => {
    it('should mark proxy as failed', () => {
      const proxy = proxyManager.getNextProxy();
      const initialFailureCount = proxy.failureCount;
      
      proxyManager.markProxyAsFailed(proxy.port);
      expect(proxy.failureCount).to.equal(initialFailureCount + 1);
    });

    it('should mark proxy as successful', () => {
      const proxy = proxyManager.getNextProxy();
      proxyManager.markProxyAsFailed(proxy.port);
      expect(proxy.failureCount).to.be.greaterThan(0);
      
      proxyManager.markProxyAsSuccessful(proxy.port);
      expect(proxy.failureCount).to.equal(0);
    });

    it('should return healthy proxies', () => {
      const proxy = proxyManager.getNextProxy();
      
      // Mark as failed multiple times
      for (let i = 0; i < 5; i++) {
        proxyManager.markProxyAsFailed(proxy.port);
      }

      const healthyProxies = proxyManager.getHealthyProxies();
      const unhealthyProxy = healthyProxies.find(p => p.port === proxy.port);
      expect(unhealthyProxy).to.be.undefined;
      expect(healthyProxies.length).to.equal(9); // 10 total - 1 unhealthy
    });
  });

  describe('statistics', () => {
    it('should return proxy statistics', () => {
      const proxy = proxyManager.getNextProxy();
      const stats = proxyManager.getProxyStats();
      
      expect(stats).to.be.an('array');
      expect(stats.length).to.equal(10);
      
      const proxyStats = stats.find(s => s.port === proxy.port);
      expect(proxyStats).to.exist;
      expect(proxyStats!.lastUsed).to.be.greaterThan(0);
      expect(proxyStats!.isHealthy).to.be.true;
    });

    it('should reset statistics', () => {
      // Use some proxies and mark failures
      const proxy1 = proxyManager.getNextProxy();
      const proxy2 = proxyManager.getNextProxy();
      
      proxyManager.markProxyAsFailed(proxy1.port);
      proxyManager.markProxyAsFailed(proxy2.port);

      // Verify stats exist
      let stats = proxyManager.getProxyStats();
      const failedStats = stats.filter(s => s.failureCount > 0);
      expect(failedStats.length).to.equal(2);

      // Reset stats
      proxyManager.resetStats();
      stats = proxyManager.getProxyStats();
      
      const allResetStats = stats.every(s => s.failureCount === 0 && s.lastUsed === 0);
      expect(allResetStats).to.be.true;
    });
  });

  describe('axios instance creation', () => {
    it('should create axios instance', () => {
      const axiosInstance = proxyManager.createAxiosInstance();
      expect(axiosInstance).to.exist;
      expect(axiosInstance.defaults).to.exist;
      expect(axiosInstance.interceptors).to.exist;
    });

    it('should create axios instance with custom config', () => {
      const axiosInstance = proxyManager.createAxiosInstance({
        baseURL: 'https://api.example.com',
        timeout: 5000
      });
      
      expect(axiosInstance.defaults.timeout).to.equal(5000);
      expect(axiosInstance.defaults.baseURL).to.equal('https://api.example.com');
    });
  });

  describe('fetch creation', () => {
    it('should create fetch function', () => {
      const fetchWithProxy = proxyManager.createFetchWithProxy();
      expect(fetchWithProxy).to.be.a('function');
    });
  });
});
