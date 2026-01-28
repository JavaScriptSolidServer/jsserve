# servejss

> Static file server with REST write support. A drop-in `npx serve` alternative.

[![npm version](https://img.shields.io/npm/v/servejss.svg)](https://www.npmjs.com/package/servejss)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## Why?

`npx serve` is great for quickly serving static files, but it's **read-only**. Sometimes you need to:

- Upload files during development
- Test REST APIs locally
- Sync files between devices on your LAN
- Have a simple WebDAV-like server

**servejss** is `serve` with superpowers: same simple interface, but you can write too.

## Install

```bash
npm install -g servejss
```

Or use directly with npx:

```bash
npx servejss
```

## Usage

```bash
# Serve current directory (read + write enabled)
servejss

# Serve specific directory
servejss ./public

# Custom port
servejss -p 8080

# Specify port and directory
servejss -l 3000 ./dist

# Read-only mode (exactly like npx serve)
servejss --read-only
```

## Output

```
 servejss

  Directory:  /home/user/project

  Local:      http://localhost:3000
  Network:    http://192.168.1.5:3000

  Mode:       GET/PUT/DELETE enabled

  Press Ctrl+C to stop
```

## REST API

```bash
# Read a file
curl http://localhost:3000/file.txt

# Create or update a file
curl -X PUT -d "Hello, World!" http://localhost:3000/file.txt

# Delete a file
curl -X DELETE http://localhost:3000/file.txt

# Conditional update (only if ETag matches)
curl -X PUT -H 'If-Match: "abc123"' -d "Updated" http://localhost:3000/file.txt

# Create only if doesn't exist
curl -X PUT -H 'If-None-Match: *' -d "New file" http://localhost:3000/new.txt
```

## Options

```
Usage: servejss [options] [directory]

Options:
  -v, --version            Output version number
  -l, --listen <uri>       Specify a URI endpoint on which to listen
  -p, --port <port>        Specify custom port (default: 3000)
  -H, --host <host>        Host to bind to (default: 0.0.0.0)
  -s, --single             Rewrite all not-found requests to index.html (SPA mode)
  -d, --debug              Show debugging information
  -C, --cors               Enable CORS (enabled by default)
  -L, --no-request-logging Do not log any request information
  --no-etag                Disable ETag generation
  -S, --symlinks           Resolve symlinks instead of showing 404
  --ssl-cert <path>        Path to SSL certificate
  --ssl-key <path>         Path to SSL private key
  --no-port-switching      Do not open a different port if specified one is taken
  -r, --read-only          Disable PUT/DELETE methods (like npx serve)
  --auth <credentials>     Enable basic auth (user:pass)
  --solid                  Enable full Solid protocol features
  -q, --quiet              Suppress all output
  -h, --help               Display help
```

## Comparison with serve

| Feature | serve | servejss |
|---------|-------|---------|
| Static file serving | ✅ | ✅ |
| Directory listings | ✅ | ✅ |
| CORS | ✅ | ✅ |
| SPA mode | ✅ | ✅ |
| Custom port | ✅ | ✅ |
| Auto port switching | ✅ | ✅ |
| SSL/TLS | ✅ | ✅ |
| **PUT (create/update)** | ❌ | ✅ |
| **DELETE** | ❌ | ✅ |
| **ETags** | ❌ | ✅ |
| **Conditional requests** | ❌ | ✅ |
| **Upgrade to Solid** | ❌ | ✅ |

## Advanced Features

### Conditional Requests

servejss supports ETags for efficient caching and safe concurrent updates:

```bash
# Get a file with its ETag
curl -i http://localhost:3000/file.txt
# Returns: ETag: "a1b2c3"

# Only fetch if changed
curl -H 'If-None-Match: "a1b2c3"' http://localhost:3000/file.txt
# Returns: 304 Not Modified (if unchanged)

# Safe update (fails if file changed since you read it)
curl -X PUT -H 'If-Match: "a1b2c3"' -d "new content" http://localhost:3000/file.txt
```

### Upgrade to Solid

servejss is powered by [JSS (JavaScript Solid Server)](https://github.com/JavaScriptSolidServer/JavaScriptSolidServer). Enable full Solid protocol support:

```bash
servejss --solid
```

This enables:
- Solid-OIDC authentication
- Web Access Control (WAC)
- Linked Data support (Turtle, JSON-LD)
- WebID profiles

## Use Cases

### Local Development Server
```bash
# Serve your project with write support for uploads
cd my-project
servejss
```

### Quick File Sharing on LAN
```bash
# Share files with devices on your network
servejss --read-only ~/shared-files
```

### REST API Testing
```bash
# Mock a simple REST backend
servejss ./mock-data
```

### WebDAV Alternative
```bash
# Lightweight file sync server
servejss --auth user:pass ~/sync
```

## License

MIT

## Related Projects

- [JSS](https://github.com/JavaScriptSolidServer/JavaScriptSolidServer) - Full Solid server
- [serve](https://github.com/vercel/serve) - Static file serving (read-only)
