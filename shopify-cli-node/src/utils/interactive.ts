import inquirer from 'inquirer';

import { loadConfig, ShopifyAccount } from '../config';

export interface PromptOptions {
  choices?: string[] | { name: string; value: string }[];
  default?: any;
  message?: string;
  skipIfPresent?: boolean;
  validate?: (input: any) => boolean | string;
}

export interface InteractivePrompts {
  [key: string]: PromptOptions | undefined;
  account?: PromptOptions;
  description?: PromptOptions;
  price?: PromptOptions;
  status?: PromptOptions;
  title?: PromptOptions;
}

export class InteractivePromptManager {
  private config: any;
  private isInteractive: boolean;

  constructor(isInteractive = true) {
    this.isInteractive = isInteractive;
  }

  /**
   * Confirm action before proceeding
   */
  async confirmAction(message: string, defaultValue = false): Promise<boolean> {
    if (!this.isInteractive) {
      return defaultValue;
    }

    const { confirmed } = await inquirer.prompt([
      {
        default: defaultValue,
        message,
        name: 'confirmed',
        type: 'confirm',
      },
    ]);

    return confirmed;
  }

  async initialize(): Promise<void> {
    this.config = await loadConfig();
  }

  /**
   * Prompt for Shopify account selection if not provided
   */
  async promptForAccount(currentAccount?: string): Promise<ShopifyAccount> {
    if (!this.config) {
      await this.initialize();
    }

    const accounts = this.config.accounts || [];
    
    if (accounts.length === 0) {
      throw new Error('No Shopify accounts configured. Please run "shopify-cli config" first.');
    }

    // If account is specified, find and return it
    if (currentAccount) {
      const account = accounts.find((acc: ShopifyAccount) => acc.name === currentAccount);
      if (!account) {
        throw new Error(`Account '${currentAccount}' not found.`);
      }

      return account;
    }

    // If only one account or interactive mode is disabled, use default or first
    if (!this.isInteractive || accounts.length === 1) {
      return accounts.find((acc: ShopifyAccount) => acc.isDefault) || accounts[0];
    }

    // Prompt for account selection
    const choices = accounts.map((acc: ShopifyAccount) => ({
      name: `${acc.name}${acc.isDefault ? ' (default)' : ''} - ${acc.shopUrl}`,
      value: acc,
    }));

    const { selectedAccount } = await inquirer.prompt([
      {
        choices,
        default: accounts.find((acc: ShopifyAccount) => acc.isDefault) || accounts[0],
        message: 'Select Shopify account:',
        name: 'selectedAccount',
        type: 'list',
      },
    ]);

    return selectedAccount;
  }

  /**
   * Prompt for multi-step input (e.g., creating a complete product)
   */
  async promptForComplexInput(schema: any): Promise<any> {
    if (!this.isInteractive) {
      return {};
    }

    const questions = this.buildQuestionsFromSchema(schema);
    return await inquirer.prompt(questions);
  }

  /**
   * Prompt for missing values in flags object
   */
  async promptForMissingFlags<T extends Record<string, any>>(
    flags: T,
    prompts: InteractivePrompts
  ): Promise<T> {
    if (!this.isInteractive) {
      return flags;
    }

    const questions: any[] = [];

    for (const [flagName, promptConfig] of Object.entries(prompts)) {
      if (!promptConfig) continue;
      
      // Skip if flag already has value and skipIfPresent is true (default)
      if (flags[flagName] && (promptConfig.skipIfPresent !== false)) {
        continue;
      }

      const question: any = {
        default: promptConfig.default || flags[flagName],
        message: promptConfig.message || `Enter ${flagName}:`,
        name: flagName,
      };

      // Handle different prompt types
      if (promptConfig.choices) {
        question.type = 'list';
        question.choices = promptConfig.choices;
      } else if (flagName.includes('password') || flagName.includes('secret')) {
        question.type = 'password';
      } else if (typeof flags[flagName] === 'boolean') {
        question.type = 'confirm';
        question.default = flags[flagName] ?? promptConfig.default ?? false;
      } else {
        question.type = 'input';
      }

      if (promptConfig.validate) {
        question.validate = promptConfig.validate;
      }

      questions.push(question);
    }

    if (questions.length === 0) {
      return flags;
    }

    const answers = await inquirer.prompt(questions);
    return { ...flags, ...answers };
  }

  /**
   * Create interactive wizard for multi-step processes
   */
  async runWizard(steps: Array<{
    message: string;
    name: string;
    questions: any[];
    validate?: (answers: any) => boolean | string;
  }>): Promise<any> {
    if (!this.isInteractive) {
      return {};
    }

    const results: any = {};

    for (const step of steps) {
      console.log(`\n📋 ${step.message}`);
      console.log('─'.repeat(step.message.length + 3));

      const stepAnswers = await inquirer.prompt(step.questions);
      
      if (step.validate) {
        const validation = step.validate(stepAnswers);
        if (validation !== true) {
          throw new Error(typeof validation === 'string' ? validation : `Invalid input in step: ${step.name}`);
        }
      }

      results[step.name] = stepAnswers;
    }

    return results;
  }

  private buildQuestionsFromSchema(schema: any): any[] {
    const questions: any[] = [];
    
    for (const [key, config] of Object.entries(schema)) {
      const questionConfig = config as any;
      
      const question: any = {
        default: questionConfig.default,
        message: questionConfig.message || `Enter ${key}:`,
        name: key,
      };

      if (questionConfig.type) {
        question.type = questionConfig.type;
      }

      if (questionConfig.choices) {
        question.type = 'list';
        question.choices = questionConfig.choices;
      }

      if (questionConfig.validate) {
        question.validate = questionConfig.validate;
      }

      if (questionConfig.when) {
        question.when = questionConfig.when;
      }

      questions.push(question);
    }

    return questions;
  }
}

/**
 * Utility function to check if the current environment supports interactive prompts
 */
export function isInteractiveEnvironment(): boolean {
  // Check if running in CI/automated environment
  const ciEnvironments = [
    'CI', 'CONTINUOUS_INTEGRATION', 'GITHUB_ACTIONS', 
    'GITLAB_CI', 'CIRCLECI', 'TRAVIS', 'JENKINS_URL',
    'TEAMCITY_VERSION', 'TF_BUILD'
  ];

  if (ciEnvironments.some(env => process.env[env])) {
    return false;
  }

  // Check if running in non-interactive terminal
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return false;
  }

  // Check for explicit non-interactive flags
  if (process.argv.includes('--no-interactive') || process.argv.includes('--non-interactive')) {
    return false;
  }

  return true;
}

/**
 * Common validation functions
 */
export const validators = {
  email(input: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(input) ? true : 'Please enter a valid email address';
  },
  
  integer(input: string) {
    const num = Number.parseInt(input, 10);
    return !isNaN(num) && num.toString() === input.trim() ? true : 'Please enter a valid integer';
  },
  
  positiveInteger(input: string) {
    const num = Number.parseInt(input, 10);
    return !isNaN(num) && num > 0 && num.toString() === input.trim() 
      ? true : 'Please enter a positive integer';
  },
  
  price(input: string) {
    const price = Number.parseFloat(input);
    return !isNaN(price) && price >= 0 ? true : 'Please enter a valid price (number >= 0)';
  },
  
  required(input: string) {
    return input && input.trim().length > 0 ? true : 'This field is required';
  },

  url(input: string) {
    try {
      new URL(input);
      return true;
    } catch {
      return 'Please enter a valid URL';
    }
  }
};
