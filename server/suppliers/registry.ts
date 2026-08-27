import type { SupplierAdapter, SupplierAdapterType, SupplierCapability, SupplierCredentials } from "./types";
import { ManualSupplierAdapter } from "./manualAdapter";
import { CsvSupplierAdapter } from "./csvAdapter";

export type SupplierAdapterFactory = (credentials: SupplierCredentials) => SupplierAdapter;

const registry = new Map<SupplierAdapterType, SupplierAdapterFactory>([
  ["manual", (credentials): SupplierAdapter => new ManualSupplierAdapter(credentials)],
  ["csv", (credentials): SupplierAdapter => new CsvSupplierAdapter(credentials)],
]);

export class SupplierAdapterRegistry {
  static register(type: SupplierAdapterType, factory: SupplierAdapterFactory) { registry.set(type, factory); }
  static create(type: SupplierAdapterType, credentials: SupplierCredentials = {}) {
    const factory = registry.get(type);
    if (!factory) throw new Error(`Supplier adapter não registrado: ${type}`);
    return factory(credentials);
  }
  static supported() { return Array.from(registry.keys()); }
  static capabilities(type: SupplierAdapterType): readonly SupplierCapability[] {
    const factory = registry.get(type);
    if (!factory) return [];
    return factory({}).capabilities;
  }
}
