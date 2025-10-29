/**
 * Example file showcasing source file utilities
 * This file demonstrates various imports and module patterns
 */

import type { PathLike } from "node:fs";
// Various import patterns
import * as fs from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path, { join, resolve } from "node:path";
import DatabaseManager from "../exports/default-export";
import type { UserData } from "../exports/named-exports";
import { createUserConfig } from "../objects/object-creation";
// Local imports
import { appConfig } from "../objects/object-literals";

// Dynamic imports (for demonstration)
async function loadModule() {
	const module = await import("../exports/mixed-exports");
	return module.default;
}

// Module with various exports for source file analysis
export class FileManager {
	private basePath: string;

	constructor(basePath: string) {
		this.basePath = basePath;
	}

	async readConfig(filename: string): Promise<UserData | null> {
		try {
			const filePath = join(this.basePath, filename);
			const content = await readFile(filePath, "utf-8");
			return JSON.parse(content) as UserData;
		} catch (error) {
			console.error(`Failed to read config: ${error}`);
			return null;
		}
	}

	async writeConfig(filename: string, config: UserData): Promise<boolean> {
		try {
			const filePath = resolve(this.basePath, filename);
			await writeFile(filePath, JSON.stringify(config, null, 2));
			return true;
		} catch (error) {
			console.error(`Failed to write config: ${error}`);
			return false;
		}
	}

	getConfigPath(filename: string): string {
		return path.join(this.basePath, filename);
	}
}

// Function using imported utilities
export async function setupFileSystem(baseDir: string): Promise<FileManager> {
	const manager = new FileManager(baseDir);

	// Use imported functions
	const _configPath = path.resolve(baseDir, "config.json");
	const _userConfig = createUserConfig("user123", {
		theme: appConfig.database.name,
	});

	// Demonstrate imported type usage
	const userData: UserData = {
		id: "test-user",
		name: "Test User",
		email: "test@example.com",
	};

	await manager.writeConfig("user.json", userData);

	return manager;
}

// Function demonstrating module loading
export async function dynamicModuleUsage(): Promise<void> {
	try {
		const moduleFactory = await loadModule();
		const service = moduleFactory(5);

		console.log(`Pool size: ${service.getPoolSize()}`);
	} catch (error) {
		console.error("Failed to load module:", error);
	}
}

export { default as DefaultDB } from "../exports/default-export";
// Re-exports for analysis
export { UserData } from "../exports/named-exports";
export * from "../objects/object-literals";

// Namespace usage
export namespace FileOperations {
	export async function exists(filePath: PathLike): Promise<boolean> {
		try {
			await fs.promises.access(filePath);
			return true;
		} catch {
			return false;
		}
	}

	export function getExtension(filename: string): string {
		return path.extname(filename);
	}
}

// Default export
export default class SourceFileManager extends FileManager {
	async initialize(): Promise<void> {
		// Initialize with imported utilities
		const dbManager = new DatabaseManager("connection-string");
		await dbManager.connect();

		console.log("Source file manager initialized");
	}
}
