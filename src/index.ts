/**
 * Main entry point for ts-ast-utilities
 * A modern, modular TypeScript AST parsing library
 *
 * Features:
 * - Core utilities for AST manipulation and analysis
 * - Specialized analysis tools for exports, function calls, and objects
 * - Advanced pattern matching for framework-specific code
 * - Focused extraction utilities for common AST elements
 * - Full TypeScript type safety and modern ES modules
 */

// Export analysis
export { analyzeExports } from "./analysis/exports";
// Function call utilities
export {
	extractFunctionCalls,
	type FunctionCallResult,
} from "./analysis/function-calls";
// Object property utilities
export {
	getBooleanPropertyValue,
	getObjectProperties,
	getObjectPropertyValue,
	hasObjectProperty,
} from "./analysis/objects";

// AST visitor utilities
export {
	findFirstNode,
	findNodes,
} from "./core/find-nodes";
// Node analysis utilities
export {
	getDeclarationName,
	getNodeComments,
	getNodeText,
	hasExportModifier,
	hasModifier,
	isAsyncFunction,
	isDefaultExport,
	isExported,
	isInFunctionContext,
} from "./core/node-analysis";
// Node value extraction
export {
	getArrayLiteralValues,
	getLiteralValue,
	getStringArrayLiterals,
	getStringLiteralValue,
} from "./core/node-extraction";
// Position and location utilities
export {
	getColumnNumber,
	getLineNumber,
	getNodePosition,
	getPositionInfo,
} from "./core/position";
// Source file utilities
export {
	createSourceFileFromContent,
	createSourceFileFromPath,
} from "./core/source-file";
// ===== CORE UTILITIES =====
// Type definitions
export type {
	ChainedFunctionCall,
	ConditionalFunctionCall,
	ConfigurationObject,
	ExportInfo,
	FunctionCallInfo,
	GenericVisitor,
	ParameterizedFunctionCall,
	PropertyInfo,
	VisitorContext,
} from "./core/types";
