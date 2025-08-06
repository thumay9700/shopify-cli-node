export interface ScriptableResponse<T = any> {
  data?: T;
  error?: {
    code: string;
    details?: any;
    message: string;
  };
  metadata?: {
    account?: string;
    command: string;
    executionTime: number;
    timestamp: string;
    version: string;
  };
  success: boolean;
}

export interface OutputFormatOptions {
  fields?: string[];
  format: 'csv' | 'json' | 'table';
  pretty?: boolean;
}

export class ScriptableOutputManager {
  private account?: string;
  private command: string;
  private startTime: number;
  private version: string;

  constructor(command: string, version = '1.0.0') {
    this.startTime = Date.now();
    this.command = command;
    this.version = version;
  }

  /**
   * Create an error response
   */
  error(code: string, message: string, details?: any): ScriptableResponse {
    return {
      error: {
        code,
        details,
        message,
      },
      metadata: {
        account: this.account,
        command: this.command,
        executionTime: Date.now() - this.startTime,
        timestamp: new Date().toISOString(),
        version: this.version,
      },
      success: false,
    };
  }

  /**
   * Output response in the requested format
   */
  output(response: ScriptableResponse, options: OutputFormatOptions): string {
    switch (options.format) {
      case 'csv': {
        return this.outputCsv(response, options.fields);
      }

      case 'json': {
        return this.outputJson(response, options.pretty);
      }

      case 'table': {
        return this.outputTable(response);
      }

      default: {
        return this.outputJson(response, options.pretty);
      }
    }
  }

  setAccount(account: string): void {
    this.account = account;
  }

  /**
   * Create a successful response
   */
  success<T>(data: T, message?: string): ScriptableResponse<T> {
    return {
      data,
      metadata: {
        account: this.account,
        command: this.command,
        executionTime: Date.now() - this.startTime,
        timestamp: new Date().toISOString(),
        version: this.version,
      },
      success: true,
    };
  }

  private escapeCsvValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }
    
    const stringValue = String(value);
    
    // Escape quotes and wrap in quotes if contains comma, quote, or newline
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replaceAll('"', '""')}"`;
    }
    
    return stringValue;
  }

  private formatArrayAsTable(data: any[]): string {
    if (data.length === 0) {
      return 'No data found';
    }

    const headers = Object.keys(data[0]);
    const headerRow = headers.map(h => String(h).padEnd(15)).join(' | ');
    const separator = headers.map(() => '─'.repeat(15)).join('─┼─');
    
    const dataRows = data.map(item => 
      headers.map(header => String(item[header] || '').slice(0, 15).padEnd(15)).join(' | ')
    );

    return [headerRow, separator, ...dataRows].join('\n');
  }

  private formatObjectAsTable(data: any): string {
    const entries = Object.entries(data);
    const keyWidth = Math.max(...entries.map(([key]) => key.length), 10);
    
    return entries.map(([key, value]) => {
      const formattedValue = typeof value === 'object' 
        ? JSON.stringify(value, null, 0) 
        : String(value);
      return `${key.padEnd(keyWidth)} | ${formattedValue}`;
    }).join('\n');
  }

  private outputCsv(response: ScriptableResponse, fields?: string[]): string {
    if (!response.success || !response.data) {
      return `error,${response.error?.message || 'Unknown error'}`;
    }

    const {data} = response;
    
    if (Array.isArray(data) && data.length > 0) {
      const headers = fields || Object.keys(data[0]);
      const csvHeaders = headers.join(',');
      const csvRows = data.map(item => 
        headers.map(header => this.escapeCsvValue(item[header])).join(',')
      ).join('\n');
      
      return `${csvHeaders}\n${csvRows}`;
    }

 if (typeof data === 'object') {
      const headers = fields || Object.keys(data);
      const values = headers.map(header => this.escapeCsvValue(data[header]));
      return `${headers.join(',')}\n${values.join(',')}`;
    }

    return String(data);
  }

  private outputJson(response: ScriptableResponse, pretty = false): string {
    return JSON.stringify(response, null, pretty ? 2 : 0);
  }

  private outputTable(response: ScriptableResponse): string {
    if (!response.success || !response.data) {
      return `Error: ${response.error?.message || 'Unknown error'}`;
    }

    const {data} = response;
    
    if (Array.isArray(data)) {
      return this.formatArrayAsTable(data);
    }

 if (typeof data === 'object') {
      return this.formatObjectAsTable(data);
    }
 
      return String(data);
    
  }
}

/**
 * Utility functions for creating common response types
 */
export const ScriptableResponseBuilder = {
  /**
   * Create a bulk operation response
   */
  bulkOperation<T>(
    results: Array<{
      error?: string;
      item: T;
      success: boolean;
    }>,
    summary?: {
      failed: number;
      successful: number;
      total: number;
    }
  ): ScriptableResponse<{
    results: Array<{
      error?: string;
      item: T;
      success: boolean;
    }>;
    summary: {
      failed: number;
      successful: number;
      total: number;
    };
  }> {
    const computedSummary = summary || {
      failed: results.filter(r => !r.success).length,
      successful: results.filter(r => r.success).length,
      total: results.length,
    };

    return this.success({
      results,
      summary: computedSummary,
    });
  },

  error(code: string, message: string, details?: any): ScriptableResponse {
    return {
      error: {
        code,
        details,
        message,
      },
      metadata: {
        command: 'unknown',
        executionTime: 0,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
      success: false,
    };
  },

  /**
   * Create a paginated response
   */
  paginated<T>(
    items: T[], 
    page: number, 
    limit: number, 
    total: number
  ): ScriptableResponse<{
    items: T[];
    pagination: {
      hasNext: boolean;
      hasPrev: boolean;
      limit: number;
      page: number;
      total: number;
      totalPages: number;
    };
  }> {
    const totalPages = Math.ceil(total / limit);
    
    return this.success({
      items,
      pagination: {
        hasNext: page < totalPages,
        hasPrev: page > 1,
        limit,
        page,
        total,
        totalPages,
      },
    });
  },

  success<T>(data: T): ScriptableResponse<T> {
    return {
      data,
      metadata: {
        command: 'unknown',
        executionTime: 0,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
      success: true,
    };
  },
};

/**
 * Middleware for commands to handle scriptable output
 */
export function withScriptableOutput<T extends Record<string, any>>(
  flags: T,
  commandName: string,
  handler: (outputManager: ScriptableOutputManager) => Promise<ScriptableResponse>
) {
  return async (log: (message: string) => void): Promise<void> => {
    const outputManager = new ScriptableOutputManager(commandName);
    
    try {
      const response = await handler(outputManager);
      
      const outputOptions: OutputFormatOptions = {
        fields: flags.fields ? flags.fields.split(',') : undefined,
        format: flags.format as 'csv' | 'json' | 'table' || 'table',
        pretty: flags.pretty !== false,
      };

      const output = outputManager.output(response, outputOptions);
      log(output);
      
      // Exit with error code if command failed
      if (!response.success) {
        process.exit(1);
      }
    } catch (error: any) {
      const errorResponse = outputManager.error(
        'EXECUTION_ERROR',
        error.message,
        { stack: error.stack }
      );
      
      const outputOptions: OutputFormatOptions = {
        format: flags.format as 'csv' | 'json' | 'table' || 'json',
        pretty: flags.pretty !== false,
      };

      const output = outputManager.output(errorResponse, outputOptions);
      log(output);
      process.exit(1);
    }
  };
}

/**
 * Check if the current execution context is scriptable (non-interactive)
 */
export function isScriptableMode(): boolean {
  // Check for CI/automated environments
  const ciEnvironments = [
    'CI', 'CONTINUOUS_INTEGRATION', 'GITHUB_ACTIONS', 
    'GITLAB_CI', 'CIRCLECI', 'TRAVIS', 'JENKINS_URL',
    'TEAMCITY_VERSION', 'TF_BUILD'
  ];

  if (ciEnvironments.some(env => process.env[env])) {
    return true;
  }

  // Check for explicit scriptable flags
  if (process.argv.includes('--json') || process.argv.includes('--script')) {
    return true;
  }

  // Check if output is being piped or redirected
  if (!process.stdout.isTTY) {
    return true;
  }

  return false;
}
