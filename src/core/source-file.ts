/**
 * Source file creation and management utilities
 */

import * as fs from "node:fs";
import * as ts from "typescript";

/**
 * Create a TypeScript source file from a file path
 */
export function createSourceFileFromPath(filePath: string): ts.SourceFile {
	const sourceContent = fs.readFileSync(filePath, "utf-8");
	return ts.createSourceFile(filePath, sourceContent, ts.ScriptTarget.Latest, true);
}

/**
 * Create a TypeScript source file from source content
 */
export function createSourceFileFromContent(filePath: string, sourceContent: string): ts.SourceFile {
	return ts.createSourceFile(filePath, sourceContent, ts.ScriptTarget.Latest, true);
}
