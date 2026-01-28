#!/usr/bin/env node

/**
 * servejs - Static file server with REST write support
 * A drop-in replacement for `npx serve` with PUT/DELETE capabilities
 */

import { program } from 'commander';
import { resolve } from 'path';
import { spawn } from 'child_process';
import { createServer } from 'net';
import { networkInterfaces } from 'os';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import chalk from 'chalk';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(fs.readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));

/**
 * Check if a port is available
 * @param {number} port
 * @returns {Promise<boolean>}
 */
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port, '0.0.0.0');
  });
}

/**
 * Find an available port starting from the given port
 * @param {number} startPort
 * @param {number} maxAttempts
 * @returns {Promise<number>}
 */
async function findAvailablePort(startPort, maxAttempts = 100) {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`Could not find available port after ${maxAttempts} attempts`);
}

/**
 * Get local network IP address
 * @returns {string|null}
 */
function getNetworkAddress() {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return null;
}

/**
 * Print the startup banner
 */
function printBanner(options) {
  const { port, host, directory, readOnly, networkAddress } = options;

  const local = `http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`;
  const network = networkAddress ? `http://${networkAddress}:${port}` : null;

  const mode = readOnly ? 'GET only (read-only)' : 'GET/PUT/DELETE enabled';

  console.log();
  console.log(chalk.bgCyan.black(' servejs '));
  console.log();
  console.log(`  ${chalk.gray('Directory:')}  ${directory}`);
  console.log();
  console.log(`  ${chalk.gray('Local:')}      ${chalk.cyan(local)}`);
  if (network) {
    console.log(`  ${chalk.gray('Network:')}    ${chalk.cyan(network)}`);
  }
  console.log();
  console.log(`  ${chalk.gray('Mode:')}       ${chalk.yellow(mode)}`);
  console.log();
  console.log(chalk.gray('  Press Ctrl+C to stop'));
  console.log();
}

/**
 * Print an error message
 */
function printError(message) {
  console.error();
  console.error(chalk.red('  ERROR:'), message);
  console.error();
}

// CLI definition - matching `serve` interface
program
  .name('servejs')
  .description('Static file server with REST write support')
  .version(pkg.version, '-v, --version')
  .argument('[directory]', 'Directory to serve', '.')
  .option('-l, --listen <uri>', 'Specify a URI endpoint on which to listen')
  .option('-p, --port <port>', 'Specify custom port', '3000')
  .option('-H, --host <host>', 'Host to bind to', '0.0.0.0')
  .option('-s, --single', 'Rewrite all not-found requests to index.html (SPA mode)')
  .option('-d, --debug', 'Show debugging information')
  .option('-C, --cors', 'Enable CORS (enabled by default)')
  .option('-L, --no-request-logging', 'Do not log any request information')
  .option('--no-etag', 'Disable ETag generation')
  .option('-S, --symlinks', 'Resolve symlinks instead of showing 404')
  .option('--ssl-cert <path>', 'Path to SSL certificate')
  .option('--ssl-key <path>', 'Path to SSL private key')
  .option('--no-port-switching', 'Do not open a different port if specified one is taken')
  // servejs-specific options
  .option('-r, --read-only', 'Disable PUT/DELETE methods (like npx serve)')
  .option('--write', 'Enable PUT/DELETE methods (default)')
  .option('--auth <credentials>', 'Enable basic auth (user:pass)')
  .option('--solid', 'Enable full Solid protocol features')
  .option('-q, --quiet', 'Suppress all output')
  .addHelpText('after', `
Examples:
  $ servejs                     Serve current directory with read/write
  $ servejs ./public            Serve specific directory
  $ servejs -p 8080             Use custom port
  $ servejs --read-only         Read-only mode (like npx serve)
  $ servejs -l 3000 ./dist      Listen on port 3000, serve ./dist

REST API:
  GET    /file.txt              Read file
  PUT    /file.txt              Create/update file
  DELETE /file.txt              Delete file
  HEAD   /file.txt              Get file metadata

Differences from 'serve':
  - PUT and DELETE enabled by default (use --read-only to disable)
  - ETag support for caching and conditional requests
  - Optional upgrade to full Solid protocol with --solid
`)
  .action(async (directory, options) => {
    try {
      await run(directory, options);
    } catch (err) {
      printError(err.message);
      process.exit(1);
    }
  });

program.parse();

/**
 * Main run function
 */
async function run(directory, options) {
  // Resolve directory
  const dir = resolve(directory || '.');

  // Check directory exists
  if (!fs.existsSync(dir)) {
    throw new Error(`Directory not found: ${dir}`);
  }

  if (!fs.statSync(dir).isDirectory()) {
    throw new Error(`Not a directory: ${dir}`);
  }

  // Parse port from --listen or --port
  let port = parseInt(options.port, 10);
  if (options.listen) {
    // Parse listen URI (e.g., "3000", "tcp://localhost:3000")
    const listenMatch = options.listen.match(/:?(\d+)$/);
    if (listenMatch) {
      port = parseInt(listenMatch[1], 10);
    }
  }

  // Find available port if needed
  const originalPort = port;
  if (options.portSwitching !== false) {
    const available = await isPortAvailable(port);
    if (!available) {
      port = await findAvailablePort(port + 1);
      if (!options.quiet) {
        console.log(chalk.yellow(`  Port ${originalPort} is in use, using ${port} instead`));
      }
    }
  } else {
    const available = await isPortAvailable(port);
    if (!available) {
      throw new Error(`Port ${port} is already in use`);
    }
  }

  // Build JSS arguments
  const jssArgs = [
    'start',
    '--root', dir,
    '--port', String(port),
    '--host', options.host,
    '--public',  // Enable open access (requires #107)
  ];

  // Read-only mode
  if (options.readOnly) {
    jssArgs.push('--read-only');
  }

  // Quiet mode
  if (options.quiet || !options.requestLogging) {
    jssArgs.push('--quiet');
  }

  // SSL
  if (options.sslCert && options.sslKey) {
    jssArgs.push('--ssl-cert', options.sslCert);
    jssArgs.push('--ssl-key', options.sslKey);
  }

  // Solid mode (full features)
  if (options.solid) {
    // Remove --public, use full Solid auth
    const publicIndex = jssArgs.indexOf('--public');
    if (publicIndex > -1) {
      jssArgs.splice(publicIndex, 1);
    }
    jssArgs.push('--idp');
    jssArgs.push('--conneg');
  }

  // Debug mode
  if (options.debug) {
    console.log(chalk.gray('  JSS args:'), jssArgs.join(' '));
  }

  // Print banner
  if (!options.quiet) {
    printBanner({
      port,
      host: options.host,
      directory: dir,
      readOnly: options.readOnly,
      networkAddress: getNetworkAddress(),
    });
  }

  // Find jss binary
  let jssPath;
  try {
    // Try to find jss in node_modules
    const jssModule = await import.meta.resolve('javascript-solid-server/bin/jss.js');
    jssPath = fileURLToPath(jssModule);
  } catch {
    // Fallback to global jss
    jssPath = 'jss';
  }

  // Spawn JSS
  const child = spawn('node', [jssPath, ...jssArgs], {
    stdio: options.quiet ? 'ignore' : ['inherit', 'pipe', 'inherit'],
    env: { ...process.env, FORCE_COLOR: '1' },
  });

  // Filter JSS output to remove its banner (we have our own)
  if (!options.quiet && child.stdout) {
    let skipBanner = true;
    child.stdout.on('data', (data) => {
      const str = data.toString();
      // Skip JSS startup banner, show rest
      if (skipBanner && (str.includes('Listening') || str.includes('Server'))) {
        skipBanner = false;
        return;
      }
      if (!skipBanner || options.debug) {
        process.stdout.write(data);
      }
    });
  }

  // Handle child process errors
  child.on('error', (err) => {
    printError(`Failed to start server: ${err.message}`);
    process.exit(1);
  });

  child.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      process.exit(code);
    }
  });

  // Handle graceful shutdown
  const shutdown = () => {
    if (!options.quiet) {
      console.log(chalk.gray('\n  Shutting down...'));
    }
    child.kill('SIGTERM');
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
