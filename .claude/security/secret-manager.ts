/**
 * Secret Manager
 * Comprehensive secret management and scanning
 * Compatible with Claude Code system
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export interface Secret {
  file: string;
  line: number;
  type: 'api_key' | 'password' | 'token' | 'credential' | 'private_key';
  pattern: string;
  severity: 'high' | 'medium' | 'low';
}

export interface ValidationResult {
  valid: boolean;
  secrets_found: Secret[];
  errors: string[];
}

export class SecretManager {
  private secretsDir: string;
  private scanPatterns: Map<string, RegExp>;

  constructor(repoRoot: string = process.cwd()) {
    this.secretsDir = path.join(repoRoot, '.claude', 'security', 'secrets');
    this.initializePatterns();
  }

  /**
   * Initialize secret detection patterns
   */
  private initializePatterns(): void {
    this.scanPatterns = new Map([
      // API Keys
      ['api_key', /(?:api[_-]?key|apikey)\s*[:=]\s*['"]([a-zA-Z0-9_\-]{20,})['"]/gi],
      ['api_key', /(?:api[_-]?key|apikey)\s*[:=]\s*([a-zA-Z0-9_\-]{20,})/gi],
      
      // Passwords
      ['password', /(?:password|passwd|pwd)\s*[:=]\s*['"]([^'"]{8,})['"]/gi],
      ['password', /(?:password|passwd|pwd)\s*[:=]\s*([^\s]{8,})/gi],
      
      // Tokens
      ['token', /(?:token|access[_-]?token|auth[_-]?token)\s*[:=]\s*['"]([a-zA-Z0-9_\-]{20,})['"]/gi],
      ['token', /(?:token|access[_-]?token|auth[_-]?token)\s*[:=]\s*([a-zA-Z0-9_\-]{20,})/gi],
      
      // AWS credentials
      ['credential', /(?:aws[_-]?access[_-]?key[_-]?id|aws[_-]?secret[_-]?access[_-]?key)\s*[:=]\s*['"]([A-Z0-9]{20,})['"]/gi],
      
      // Private keys
      ['private_key', /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/gi],
      
      // GitHub tokens
      ['token', /ghp_[a-zA-Z0-9]{36}/g],
      
      // Generic secrets
      ['credential', /(?:secret|credential|cred)\s*[:=]\s*['"]([a-zA-Z0-9_\-]{16,})['"]/gi],
    ]);
  }

  /**
   * Scan file for secrets
   */
  async scanFile(filePath: string): Promise<Secret[]> {
    const secrets: Secret[] = [];

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        this.scanPatterns.forEach((pattern, type) => {
          const matches = line.matchAll(pattern);
          for (const match of matches) {
            // Skip if it's in a comment or string that's clearly a placeholder
            if (line.includes('TODO') || line.includes('FIXME') || 
                line.includes('example') || line.includes('placeholder') ||
                line.includes('your-') || line.includes('replace-')) {
              return;
            }

            // Skip if it's an environment variable reference
            if (line.includes('process.env') || line.includes('${') || 
                line.includes('env(') || line.includes('getenv')) {
              return;
            }

            secrets.push({
              file: filePath,
              line: index + 1,
              type: type as Secret['type'],
              pattern: match[0],
              severity: this.getSeverity(type as Secret['type'])
            });
          }
        });
      });
    } catch (error) {
      // File might not exist or be unreadable, skip it
    }

    return secrets;
  }

  /**
   * Scan directory for secrets
   */
  async scanDirectory(dirPath: string, excludeDirs: string[] = []): Promise<Secret[]> {
    const secrets: Secret[] = [];
    const excludeSet = new Set(['node_modules', '.git', 'dist', 'build', '.next', ...excludeDirs]);

    async function scanRecursive(currentPath: string): Promise<void> {
      try {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(currentPath, entry.name);

          // Skip excluded directories
          if (entry.isDirectory() && excludeSet.has(entry.name)) {
            continue;
          }

          // Skip .claude directory (contains our own secrets/config)
          if (entry.name === '.claude') {
            continue;
          }

          if (entry.isDirectory()) {
            await scanRecursive(fullPath);
          } else if (entry.isFile()) {
            // Only scan text files
            const ext = path.extname(entry.name);
            const textExtensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.yml', '.yaml', '.md', '.txt', '.sh'];
            if (textExtensions.includes(ext) || !ext) {
              const fileSecrets = await this.scanFile(fullPath);
              secrets.push(...fileSecrets);
            }
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    }

    await scanRecursive(dirPath);
    return secrets;
  }

  /**
   * Get severity for secret type
   */
  private getSeverity(type: Secret['type']): 'high' | 'medium' | 'low' {
    switch (type) {
      case 'private_key':
      case 'password':
        return 'high';
      case 'api_key':
      case 'token':
        return 'medium';
      default:
        return 'low';
    }
  }

  /**
   * Validate secrets (check if they're actually secrets or placeholders)
   */
  async validateSecrets(secrets: Secret[]): Promise<ValidationResult> {
    const validSecrets: Secret[] = [];
    const errors: string[] = [];

    for (const secret of secrets) {
      // Read the file to get context
      try {
        const content = await fs.readFile(secret.file, 'utf-8');
        const lines = content.split('\n');
        const line = lines[secret.line - 1];

        // Check if it's a placeholder or example
        if (line.includes('example') || line.includes('placeholder') ||
            line.includes('your-') || line.includes('replace-') ||
            line.includes('TODO') || line.includes('FIXME')) {
          continue; // Skip placeholders
        }

        // Check if it's an environment variable reference
        if (line.includes('process.env') || line.includes('${') ||
            line.includes('env(') || line.includes('getenv')) {
          continue; // Skip env var references
        }

        // Check if it's in a test file (usually okay)
        if (secret.file.includes('/test/') || secret.file.includes('/tests/') ||
            secret.file.includes('.test.') || secret.file.includes('.spec.')) {
          // Still flag it but with lower severity
          secret.severity = 'low';
        }

        validSecrets.push(secret);
      } catch (error) {
        errors.push(`Could not validate secret in ${secret.file}:${secret.line}`);
      }
    }

    return {
      valid: validSecrets.length === 0,
      secrets_found: validSecrets,
      errors
    };
  }

  /**
   * Scan and validate
   */
  async scanForSecrets(targetPath: string): Promise<ValidationResult> {
    const stats = await fs.stat(targetPath);
    let secrets: Secret[] = [];

    if (stats.isDirectory()) {
      secrets = await this.scanDirectory(targetPath);
    } else {
      secrets = await this.scanFile(targetPath);
    }

    return this.validateSecrets(secrets);
  }

  /**
   * Save scan results
   */
  async saveScanResults(results: ValidationResult): Promise<string> {
    await fs.mkdir(this.secretsDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filepath = path.join(this.secretsDir, `scan-${timestamp}.json`);
    await fs.writeFile(filepath, JSON.stringify(results, null, 2));
    return filepath;
  }
}

/**
 * CLI interface
 */
if (require.main === module) {
  const targetPath = process.argv[2] || process.cwd();
  const manager = new SecretManager();

  manager.scanForSecrets(targetPath)
    .then(async (results) => {
      if (results.secrets_found.length > 0) {
        console.error('Secrets found:');
        results.secrets_found.forEach(secret => {
          console.error(`  ${secret.file}:${secret.line} - ${secret.type} (${secret.severity})`);
          console.error(`    Pattern: ${secret.pattern.substring(0, 50)}...`);
        });
        
        await manager.saveScanResults(results);
        process.exit(1);
      } else {
        console.log('No secrets found');
        process.exit(0);
      }
    })
    .catch(error => {
      console.error('Error:', error);
      process.exit(1);
    });
}
