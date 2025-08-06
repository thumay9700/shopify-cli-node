import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { SocksProxyAgent } from 'socks-proxy-agent';

export interface ProxyConfig {
  host: string;
  maxRetries: number;
  portRange: {
    end: number;
    start: number;
  };
  retryDelay: number;
}

export interface ProxyInfo {
  agent: SocksProxyAgent;
  failureCount: number;
  host: string;
  lastUsed: number;
  port: number;
}

export class ProxyManager {
  private availablePorts: number[] = [];
  private config: ProxyConfig;
  private currentPortIndex = 0;
  private proxies: Map<number, ProxyInfo> = new Map();
  private usedPorts: Set<number> = new Set();

  constructor(config?: Partial<ProxyConfig>) {
    this.config = {
      host: 'us.decodo.com',
      maxRetries: 3,
      portRange: { end: 10_010, start: 10_001 },
      retryDelay: 1000,
      ...config
    };

    this.initializePorts();
    this.setupProxies();
  }

  /**
   * Create an Axios instance with proxy rotation and retry logic
   */
  public createAxiosInstance(baseConfig?: AxiosRequestConfig): AxiosInstance {
    const instance = axios.create(baseConfig);

    // Add request interceptor to set proxy
    instance.interceptors.request.use((config: any) => {
      const proxy = this.getNextProxy();
      config.httpsAgent = proxy.agent;
      config.httpAgent = proxy.agent;
      
      // Store the proxy port for retry logic
      config._proxyPort = proxy.port;
      
      return config;
    });

    // Add response interceptor for error handling and retries
    instance.interceptors.response.use(
      (response) => {
        // Mark proxy as successful on successful response
        const proxyPort = (response.config as any)._proxyPort;
        if (proxyPort) {
          this.markProxyAsSuccessful(proxyPort);
        }

        return response;
      },
      async (error) => {
        const {config} = error;
        const proxyPort = config?._proxyPort;

        if (proxyPort) {
          this.markProxyAsFailed(proxyPort);
        }

        // Retry logic
        const retryCount = config._retryCount || 0;
        if (retryCount < this.config.maxRetries) {
          config._retryCount = retryCount + 1;
          
          // Wait before retrying
          await this.delay(this.config.retryDelay);
          
          // Get a different proxy for retry
          const newProxy = this.getNextProxy();
          config.httpsAgent = newProxy.agent;
          config.httpAgent = newProxy.agent;
          config._proxyPort = newProxy.port;

          return instance(config);
        }

        throw error;
      }
    );

    return instance;
  }

  /**
   * Create a fetch function with proxy support
   */
  public createFetchWithProxy(): typeof fetch {
    return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      let lastError: Error | null = null;
      let retryCount = 0;

      while (retryCount <= this.config.maxRetries) {
        const proxy = this.getNextProxy();
        
        try {
          const response = await fetch(input, {
            ...init,
            // @ts-ignore - Node.js fetch supports agent
            agent: proxy.agent
          });

          if (response.ok) {
            this.markProxyAsSuccessful(proxy.port);
            return response;
          }
 
            this.markProxyAsFailed(proxy.port);
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          
        } catch (error) {
          lastError = error as Error;
          this.markProxyAsFailed(proxy.port);
          
          if (retryCount < this.config.maxRetries) {
            await this.delay(this.config.retryDelay);
          }

          retryCount++;
        }
      }

      throw lastError || new Error('All proxy attempts failed');
    };
  }

  /**
   * Get the current configuration
   */
  public getConfig(): ProxyConfig {
    return { ...this.config };
  }

  /**
   * Get healthy proxies (with low failure count)
   */
  public getHealthyProxies(): ProxyInfo[] {
    return [...this.proxies.values()].filter(proxy => proxy.failureCount < 3);
  }

  /**
   * Get the next available proxy, rotating through unused ports first
   */
  public getNextProxy(): ProxyInfo {
    // First, try to get an unused port
    const unusedPort = this.getUnusedPort();
    if (unusedPort !== null) {
      const proxy = this.proxies.get(unusedPort)!;
      this.markPortAsUsed(unusedPort);
      return proxy;
    }

    // If all ports have been used, reset and use least recently used
    this.resetUsedPorts();
    return this.getLeastRecentlyUsedProxy();
  }

  /**
   * Get proxy statistics
   */
  public getProxyStats(): Array<{ failureCount: number; isHealthy: boolean; lastUsed: number; port: number; }> {
    return [...this.proxies.values()].map(proxy => ({
      failureCount: proxy.failureCount,
      isHealthy: proxy.failureCount < 3,
      lastUsed: proxy.lastUsed,
      port: proxy.port
    }));
  }

  /**
   * Mark a proxy as failed and increment failure count
   */
  public markProxyAsFailed(port: number): void {
    const proxy = this.proxies.get(port);
    if (proxy) {
      proxy.failureCount++;
      console.warn(`Proxy ${proxy.host}:${port} failed (failure count: ${proxy.failureCount})`);
    }
  }

  /**
   * Reset failure count for a proxy after successful use
   */
  public markProxyAsSuccessful(port: number): void {
    const proxy = this.proxies.get(port);
    if (proxy) {
      proxy.failureCount = 0;
    }
  }

  /**
   * Reset all proxy statistics
   */
  public resetStats(): void {
    for (const proxy of this.proxies.values()) {
      proxy.failureCount = 0;
      proxy.lastUsed = 0;
    }

    this.usedPorts.clear();
  }

  /**
   * Utility method to delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get the least recently used proxy
   */
  private getLeastRecentlyUsedProxy(): ProxyInfo {
    let leastRecentProxy: null | ProxyInfo = null;
    let oldestTime = Date.now();

    for (const proxy of this.proxies.values()) {
      if (proxy.lastUsed < oldestTime) {
        oldestTime = proxy.lastUsed;
        leastRecentProxy = proxy;
      }
    }

    if (!leastRecentProxy) {
      // Fallback to first available proxy
      leastRecentProxy = [...this.proxies.values()][0];
    }

    this.markPortAsUsed(leastRecentProxy.port);
    return leastRecentProxy;
  }

  /**
   * Get an unused port from the available pool
   */
  private getUnusedPort(): null | number {
    for (const port of this.availablePorts) {
      if (!this.usedPorts.has(port)) {
        return port;
      }
    }

    return null;
  }

  /**
   * Initialize the available ports array
   */
  private initializePorts(): void {
    this.availablePorts = [];
    for (let port = this.config.portRange.start; port <= this.config.portRange.end; port++) {
      this.availablePorts.push(port);
    }
  }

  /**
   * Mark a port as used and update last used timestamp
   */
  private markPortAsUsed(port: number): void {
    this.usedPorts.add(port);
    const proxy = this.proxies.get(port);
    if (proxy) {
      proxy.lastUsed = Date.now();
    }
  }

  /**
   * Reset the used ports set when all ports have been used
   */
  private resetUsedPorts(): void {
    this.usedPorts.clear();
  }

  /**
   * Set up proxy agents for all available ports
   */
  private setupProxies(): void {
    for (const port of this.availablePorts) {
      const proxyUrl = `socks5://${this.config.host}:${port}`;
      const agent = new SocksProxyAgent(proxyUrl);
      
      this.proxies.set(port, {
        agent,
        failureCount: 0,
        host: this.config.host,
        lastUsed: 0,
        port
      });
    }
  }
}

// Default export for convenience
export default ProxyManager;
