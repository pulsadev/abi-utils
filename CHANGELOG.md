# Changelog

## [0.1.0] - 2026-08-10

### Added

- Full ABI encoding/decoding: encodeFunctionData, decodeFunctionResult, decodeFunctionData
- Event support: encodeEventTopics, decodeEventLog with indexed parameter handling
- Error decoding: Error(string), Panic(uint256), and custom ABI errors
- encodePacked: Solidity abi.encodePacked equivalent
- Human-readable ABI parsing: parseAbi, formatAbi
- TypeScript ABI type inference: SolidityToTs, ExtractFunctionNames, InferFunctionOutputs
- Selector caching for repeated calls (59x speedup)
- Pure keccak256 implementation (zero crypto dependencies)
- Complete Solidity type coverage: uint/int (8-256), address, bool, bytes (1-32), bytes, string, arrays, tuples
- ESM + CJS dual format with full TypeScript declarations
- 107 tests passing (unit + integration against Ethereum mainnet)
- Zero runtime dependencies (~24 KB bundled)
