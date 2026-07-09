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

## How it works

servejss doesn't serve anything itself — it's a thin launcher for
[JSS](https://github.com/JavaScriptSolidServer/JavaScriptSolidServer).
It translates `serve`-style flags into a `jss start` invocation, points it
at your directory in `--public` mode (no auth, WAC skipped), picks a free
port, prints the banner, and manages the child process. Every request is
handled by JSS.

In practice that split means:

- **servejss owns** the CLI, the serve-a-directory defaults (public mode,
  live reload, git backend), port auto-switching, and the startup UX
- **JSS owns** everything about actual serving: GET/PUT/DELETE handling,
  ETags and conditional requests, the git HTTP backend, and all Solid
  protocol features — so issues about request behavior belong upstream
- `--solid` drops the public default and starts JSS as a full
  authenticated Solid server (Solid-OIDC + WAC)

## Install

```bash
npm install -g servejss
```

Or use directly with npx:

```bash
npx servejss
```

servejss requires JSS >= 0.0.211, which never writes `index.html` or `.acl`
files into the served directory. If the bundled dependency is missing,
servejss falls back to a globally installed `jss` — if you have an old
global install, update it too:

```bash
npm install -g javascript-solid-server@latest
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
# Lightweight file sync server — no auth, trusted networks only
servejss ~/sync

# Authenticated sync (Solid-OIDC + Web Access Control)
servejss --solid ~/sync
```

> **Note:** basic auth (`--auth user:pass`) is not implemented yet; passing
> `--auth` refuses to start rather than silently serving unauthenticated.

## License

MIT

## Related Projects

- [JSS](https://github.com/JavaScriptSolidServer/JavaScriptSolidServer) - Full Solid server
- [serve](https://github.com/vercel/serve) - Static file serving (read-only)
