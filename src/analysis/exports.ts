/**
 * Export analysis utilities for TypeScript source files
 */

import * as ts from "typescript";
import type { ExportInfo } from "../core/types";

/**
 * Analyze export patterns in a TypeScript source file
 */
export function analyzeExports(sourceFile: ts.SourceFile): ExportInfo {
	let hasNamedExports = false;
	let hasDefaultExport = false;
	const namedExports: string[] = [];

	function visit(node: ts.Node): void {
		// Check for named exports
		if (ts.isExportDeclaration(node) && node.exportClause) {
			hasNamedExports = true;
			if (ts.isNamedExports(node.exportClause)) {
				for (const element of node.exportClause.elements) {
					namedExports.push(element.name.text);
				}
			}
		}

		// Check for declarations with export modifier
		if (
			ts.isVariableStatement(node) ||
			ts.isFunctionDeclaration(node) ||
			ts.isClassDeclaration(node) ||
			ts.isTypeAliasDeclaration(node) ||
			ts.isInterfaceDeclaration(node)
		) {
			const hasExportModifier = node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
			const hasDefaultModifier = node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword);

			if (hasExportModifier) {
				if (hasDefaultModifier) {
					hasDefaultExport = true;
				} else {
					hasNamedExports = true;
					if (ts.isFunctionDeclaration(node) && node.name) {
						namedExports.push(node.name.text);
					} else if (ts.isClassDeclaration(node) && node.name) {
						namedExports.push(node.name.text);
					} else if (ts.isTypeAliasDeclaration(node) && node.name) {
						namedExports.push(node.name.text);
					} else if (ts.isInterfaceDeclaration(node) && node.name) {
						namedExports.push(node.name.text);
					} else if (ts.isVariableStatement(node)) {
						for (const declaration of node.declarationList.declarations) {
							if (ts.isIdentifier(declaration.name)) {
								namedExports.push(declaration.name.text);
							}
						}
					}
				}
			}
		}

		// Check for default exports
		if (ts.isExportAssignment(node) && !node.isExportEquals) {
			hasDefaultExport = true;
		}

		ts.forEachChild(node, visit);
	}

	visit(sourceFile);

	const exportType: ExportInfo["exportType"] =
		hasNamedExports && hasDefaultExport ? "both" : hasDefaultExport ? "default" : hasNamedExports ? "named" : "none";

	return {
		exportType,
		namedExports: [...new Set(namedExports)], // Remove duplicates
		hasDefaultExport,
	};
}
