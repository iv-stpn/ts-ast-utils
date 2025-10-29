/**
 * Core type definitions used throughout the AST utilities
 */

import type ts from "typescript";

export type ExportInfo = {
	exportType: "named" | "default" | "both" | "none";
	namedExports: string[];
	hasDefaultExport: boolean;
};

export type PropertyInfo = {
	key: string;
	value: unknown;
	valueNode: ts.Node;
	isComputed: boolean;
};

export type VisitorContext<T = unknown> = {
	sourceFile: ts.SourceFile;
	depth: number;
	ancestors: ts.Node[];
	userData?: T;
};

export type GenericVisitor<TResult = void> = (node: ts.Node, context: VisitorContext) => TResult;

export type ConfigurationObject = {
	properties: Record<string, unknown>;
	nestedObjects: Record<string, ConfigurationObject>;
	arrays: Record<string, unknown[]>;
};
