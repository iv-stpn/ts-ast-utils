/**
 * Core type definitions used throughout the AST utilities
 */

import type * as ts from "typescript";

// ===== CORE TYPES =====

export type FunctionCallInfo<T = Record<string, unknown>> = {
	functionName: string;
	arguments: ts.NodeArray<ts.Expression>;
	argumentValues: unknown[];
	node: ts.CallExpression;
	metadata?: T;
};

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

// ===== SPECIALIZED TYPES =====

export type ParameterizedFunctionCall = FunctionCallInfo & {
	pathParameter?: string | null;
	stringParameters: string[];
	objectParameters: Record<string, unknown>[];
};

export type ChainedFunctionCall = FunctionCallInfo & {
	chainedMethods: string[];
	finalArguments: unknown[];
};

export type ConditionalFunctionCall = FunctionCallInfo & {
	isConditional: boolean;
	condition?: string;
	isInExportContext: boolean;
};

export type ConfigurationObject = {
	properties: Record<string, unknown>;
	nestedObjects: Record<string, ConfigurationObject>;
	arrays: Record<string, unknown[]>;
};
