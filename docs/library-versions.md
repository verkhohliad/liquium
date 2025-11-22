# Liquium - Library Versions & Dependencies

## Version Matrix

This document specifies exact versions of all dependencies to ensure reproducible builds and compatibility across the monorepo.

**Last Updated**: 2025-11-22 02:05 UTC  
**Node.js Version**: v22.3.0 (LTS)  
**Package Manager**: pnpm 9.x  

---

## Root Dependencies

### package.json (Root Workspace)
```json
{
  "name": "liquium",
  "version": "0.1.0",
  "private": true,
  "workspaces": [
    "contracts",
    "contracts-remote",
    "backend",
    "frontend"
  ],
  "devDependencies": {
    "typescript": "^5.7.0",
    "eslint": "^9.0.0",
    "prettier": "^3.2.0",
    "turbo": "^2.0.0"
  },
  "engines": {
    "node": ">=22.3.0",
    "pnpm": ">=9.0.0"
  }
}
```

---

## Contracts Package (Flare)

### Location: `/contracts`

### Core Dependencies
```json
{
  "name": "@liquium/contracts",
  "version": "0.1.0",
  "dependencies": {
    "@openzeppelin/contracts": "^5.0.0",
    "@openzeppelin/contracts-upgradeable": "^5.0.0"
  },
  "devDependencies": {
    "hardhat": "^3.0.0",
    "@nomicfoundation/hardhat-toolbox": "^5.0.0",
    "@nomicfoundation/hardhat-viem": "^2.0.0",
    "@nomicfoundation/hardhat-verify": "^2.0.0",
    "@typechain/hardhat": "^9.1.0",
    "hardhat-deploy": "^0.12.0",
    "hardhat-gas-reporter": "^2.0.0",
    "solidity-coverage": "^0.8.5",
    "viem": "^2.39.3",
    "typescript": "^5.7.0",
    "ts-node": "^10.9.2",
    "dotenv": "^16.4.5",
    "@types/node": "^20.10.0"
  }
}
```

### Protocol Dependencies
```json
{
  "@erc7824/nitrolite": "latest",
  "@layerzerolabs/oapp-evm": "^2.0.0",
  "@layerzerolabs/lz-evm-protocol-v2": "^2.0.0"
}
```

### Compiler Configuration
```typescript
// hardhat.config.ts
{
  solidity: {
    version: "0.8.27",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      viaIR: false
    }
  }
}
```

### Key Version Notes
- **Hardhat 3.0.0**
- **OpenZeppelin 5.0.0**: Latest stable, includes Ownable2Step
- **Solidity 0.8.27**: Latest stable compiler
- **viem 2.39.3**: Matches backend and frontend versions

---

## Contracts-Remote Package (Base Sepolia)

### Location: `/contracts-remote`

### Dependencies
Same as main contracts package, but with minimal setup:

```json
{
  "name": "@liquium/contracts-remote",
  "version": "0.1.0",
  "dependencies": {
    "@layerzerolabs/oapp-evm": "^2.0.0"
  },
  "devDependencies": {
    "hardhat": "^3.0.0",
    "@nomicfoundation/hardhat-toolbox": "^5.0.0",
    "@nomicfoundation/hardhat-viem": "^2.0.0",
    "viem": "^2.39.3",
    "typescript": "^5.7.0",
    "dotenv": "^16.4.5"
  }
}
```

---

## Backend Package

### Location: `/backend`

### Core Dependencies
```json
{
  "name": "@liquium/backend",
  "version": "0.1.0",
  "type": "module",
  "dependencies": {
    "viem": "^2.39.3",
    "dotenv": "^16.4.5",
    "zod": "^3.23.8",
    "pino": "^9.0.0",
    "pino-pretty": "^11.0.0",
    "axios": "^1.7.7",
    "commander": "^12.0.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "ts-node": "^10.9.2",
    "@types/node": "^20.10.0",
    "vitest": "^2.1.0",
    "tsx": "^4.7.0"
  }
}
```

### Protocol Integration Dependencies
```json
{
  "@erc7824/nitrolite": "latest",
  "@layerzerolabs/oapp-evm": "^2.0.0",
  "@layerzerolabs/lz-evm-protocol-v2": "^2.0.0",
  "@layerzerolabs/lz-v2-utilities": "^2.0.0"
}
```

### Optional Dependencies
```json
{
  "@fluencelabs/js-client": "^0.13.0",
  "express": "^4.18.2",
  "@types/express": "^4.17.21"
}
```

### Key Version Notes
- **viem 2.39.3**: Primary blockchain client (replaces ethers.js)
- **zod 3.23.8**: Runtime type validation
- **pino 9.0.0**: Structured logging
- **commander 12.0.0**: CLI framework
- **vitest 2.1.0**: Testing framework (faster than Jest)

---

## Frontend Package

### Location: `/frontend`

### Core Dependencies
```json
{
  "name": "@liquium/frontend",
  "version": "0.1.0",
  "dependencies": {
    "next": "^15.0.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "typescript": "^5.7.0"
  }
}
```

### Web3 Dependencies
```json
{
  "viem": "^2.39.3",
  "wagmi": "^2.19.4",
  "@rainbow-me/rainbowkit": "^2.1.4",
  "@tanstack/react-query": "^5.0.0"
}
```

### UI Dependencies
```json
{
  "tailwindcss": "^3.4.14",
  "postcss": "^8.4.47",
  "autoprefixer": "^10.4.20",
  "@radix-ui/react-dialog": "^1.0.5",
  "@radix-ui/react-dropdown-menu": "^2.0.6",
  "@radix-ui/react-tooltip": "^1.0.7",
  "lucide-react": "^0.344.0",
  "clsx": "^2.1.0",
  "tailwind-merge": "^2.2.0"
}
```

### Utility Dependencies
```json
{
  "zod": "^3.23.8",
  "axios": "^1.7.7",
  "date-fns": "^3.0.0"
}
```

### Development Dependencies
```json
{
  "@types/node": "^20.10.0",
  "@types/react": "^18.3.0",
  "@types/react-dom": "^18.3.0",
  "eslint": "^9.0.0",
  "eslint-config-next": "^15.0.0"
}
```

### Key Version Notes
- **Next.js 15.0.0**: Latest with App Router
- **React 18.3.1**: Stable release
- **wagmi 2.19.4**: Compatible with viem 2.x
- **RainbowKit 2.1.4**: Latest wallet UI
- **TanStack Query 5.0.0**: Data fetching (replaces SWR)

---

## Version Compatibility Matrix

### Critical Compatibility Requirements

| Library | Version | Compatible With | Notes |
|---------|---------|-----------------|-------|
| viem | 2.39.3 | wagmi 2.x, Hardhat 3.0 | Must match across packages |
| wagmi | 2.19.4 | viem 2.x, React 18.x | Requires viem 2.x |
| RainbowKit | 2.1.4 | wagmi 2.x | Check compatibility table |
| Hardhat | 3.0.0 | viem 2.x |  |
| TypeScript | 5.7.0 | All packages | Use same version everywhere |
| Next.js | 15.0.0 | React 18.3.1 | App Router stable |

### Known Compatibility Issues

**Issue 1: Hardhat + viem**
- ✅ Hardhat 3.0.0 natively supports viem
- ❌ Hardhat <3.0.0 requires ethers.js
- **Solution**: Must use Hardhat 3.0.0

**Issue 2: wagmi + viem**
- ✅ wagmi 2.x requires viem 2.x
- ❌ wagmi 1.x uses viem 1.x (incompatible)
- **Solution**: Ensure wagmi 2.19.4 + viem 2.39.3

**Issue 3: RainbowKit + wagmi**
- ✅ RainbowKit 2.x works with wagmi 2.x
- ❌ Older versions incompatible
- **Solution**: Check https://www.rainbowkit.com/docs/installation#compatibility

---

## Network-Specific Versions

### Flare Network
```typescript
{
  chainId: 114, // Coston2 Testnet
  rpcUrl: "https://coston2-api.flare.network/ext/bc/C/rpc",
  explorer: "https://coston2-explorer.flare.network",
  contracts: {
    ftsoFeedPublisher: "TBD", // From Flare docs
    secureRandom: "TBD"
  }
}
```

### Base Sepolia
```typescript
{
  chainId: 84532,
  rpcUrl: "https://sepolia.base.org",
  explorer: "https://sepolia.basescan.org",
  contracts: {
    lzEndpoint: "0x6EDCE65403992e310A62460808c4b910D972f10f"
  }
}
```

### LayerZero Endpoint IDs
```typescript
{
  flareTestnet: TBD, // Check LZ docs for Coston2
  baseSepoliaTestnet: 40245
}
```

---

## Testing Dependencies

### Smart Contracts
```json
{
  "chai": "^4.3.10",
  "@nomicfoundation/hardhat-chai-matchers": "^2.0.0",
  "hardhat-gas-reporter": "^2.0.0",
  "solidity-coverage": "^0.8.5"
}
```

### Backend
```json
{
  "vitest": "^2.1.0",
  "@vitest/ui": "^2.1.0",
  "c8": "^9.0.0"
}
```

### Frontend
```json
{
  "@testing-library/react": "^14.1.0",
  "@testing-library/jest-dom": "^6.1.0",
  "@testing-library/user-event": "^14.5.0",
  "playwright": "^1.40.0"
}
```

---

## Build Tool Versions

### pnpm
```bash
pnpm --version
# Expected: 9.0.0 or higher
```

### Node.js
```bash
node --version
# Expected: v22.3.0 or higher
```

### TypeScript
```bash
npx tsc --version
# Expected: Version 5.7.0
```

### Hardhat
```bash
npx hardhat --version
# Expected: 3.0.0
```

---

## Installation Commands

### Fresh Install
```bash
# Root
pnpm install

# Specific package
cd contracts && pnpm install
cd backend && pnpm install
cd frontend && pnpm install
```

### Update Dependencies
```bash
# Check outdated
pnpm outdated

# Update all (careful!)
pnpm update

# Update specific package
pnpm update viem --recursive
```

### Lock File
```bash
# Generate lock file
pnpm install --frozen-lockfile

# Verify lock file
pnpm install --lockfile-only
```

---

## Protocol-Specific Versions

### Yellow / Nitrolite
```json
{
  "@erc7824/nitrolite": "latest",
  "notes": [
    "Package is new, version may change",
    "Check npmjs.com/@erc7824/nitrolite for latest",
    "SDK and contracts in same package"
  ]
}
```

### LayerZero v2
```json
{
  "@layerzerolabs/oapp-evm": "^2.0.0",
  "@layerzerolabs/lz-evm-protocol-v2": "^2.0.0",
  "@layerzerolabs/lz-v2-utilities": "^2.0.0",
  "notes": [
    "v2 is current production version",
    "OApp base contracts in oapp-evm",
    "Protocol contracts in lz-evm-protocol-v2"
  ]
}
```

### 1inch
```json
{
  "notes": [
    "No npm package - REST API only",
    "API version: v6.0",
    "Base URL: https://api.1inch.dev",
    "Requires API key from portal.1inch.dev"
  ]
}
```

### Flare
```json
{
  "notes": [
    "No npm package - use contract ABIs",
    "FTSO v2 documentation: dev.flare.network/ftso",
    "Testnet: Coston2 (chainId: 114)",
    "RPC: https://coston2-api.flare.network/ext/bc/C/rpc"
  ]
}
```

---

## CI/CD Versions

### GitHub Actions
```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 22.3.0
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm test
```

---

## Troubleshooting

### Issue: pnpm install fails
**Solution**:
```bash
# Clear cache
pnpm store prune

# Delete node_modules
rm -rf node_modules

# Reinstall
pnpm install
```

### Issue: TypeScript version mismatch
**Solution**:
```bash
# Use workspace TypeScript
pnpm add -D typescript@5.7.0 --workspace-root

# Verify
pnpm list typescript
```

### Issue: viem/wagmi compatibility
**Solution**:
```bash
# Check versions
pnpm list viem wagmi

# Ensure viem 2.x and wagmi 2.x
pnpm add viem@2.39.3 wagmi@2.19.4
```

### Issue: Hardhat compilation fails
**Solution**:
```bash
# Clear cache
npx hardhat clean

# Reinstall
pnpm install

# Recompile
npx hardhat compile
```

---

## Security Considerations

### Dependency Auditing
```bash
# Check for vulnerabilities
pnpm audit

# Fix automatically
pnpm audit --fix

# Check specific package
pnpm audit --package=axios
```

### Lock File Security
- ✅ Commit `pnpm-lock.yaml` to git
- ✅ Use `--frozen-lockfile` in CI
- ✅ Regular dependency updates
- ❌ Don't commit `node_modules`

---

## Update Strategy

### Monthly Updates
1. Check for security advisories
2. Update devDependencies first
3. Test thoroughly
4. Update dependencies
5. Update lock file

### Major Version Updates
1. Read changelog
2. Check breaking changes
3. Update one package at a time
4. Run full test suite
5. Update documentation

### Emergency Updates
1. Security patches immediately
2. Critical bug fixes ASAP
3. Test in development first
4. Deploy to testnet
5. Monitor for issues

---

## Version History

### v0.1.0 (2025-11-22) - Initial
- Node.js: v22.3.0
- Hardhat: 3.0.0
- viem: 2.39.3
- wagmi: 2.19.4
- Next.js: 15.0.0
- TypeScript: 5.7.0

---

*Last Updated: 2025-11-22 02:05 UTC*
