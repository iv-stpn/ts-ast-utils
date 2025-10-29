/**
 * Object property analysis utilities
 */

import * as ts from "typescript";
import { getArrayLiteralValues, getLiteralValue } from "../core/node-extraction.js";
import type { PropertyInfo } from "../core/types.js";

/**
 * Extract properties from object literal expression
 */
export function getObjectProperties(node: ts.ObjectLiteralExpression): PropertyInfo[] {
	const properties: PropertyInfo[] = [];

	for (const property of node.properties) {
		if (ts.isPropertyAssignment(property)) {
			let key: string;
			let isComputed = false;

			if (ts.isIdentifier(property.name)) {
				key = property.name.text;
			} else if (ts.isStringLiteral(property.name)) {
				key = property.name.text;
			} else if (ts.isComputedPropertyName(property.name)) {
				key = property.name.expression.getText();
				isComputed = true;
			} else {
				continue; // Skip unsupported property names
			}

			// Enhanced value extraction that handles complex types
			let value: unknown;
			if (ts.isArrayLiteralExpression(property.initializer)) {
				// For arrays, extract the literal values
				value = getArrayLiteralValues(property.initializer);
			} else if (ts.isObjectLiteralExpression(property.initializer)) {
				// For nested objects, mark as object type but don't recursively extract
				value = {}; // Placeholder object to indicate this is an object property
			} else {
				// For primitives, use the existing function
				value = getLiteralValue(property.initializer);
			}

			properties.push({
				key,
				value,
				valueNode: property.initializer,
				isComputed,
			});
		}
	}

	return properties;
}

/**
 * Get specific property value from object literal
 */
export function getObjectPropertyValue(node: ts.ObjectLiteralExpression, propertyName: string): unknown {
	for (const property of node.properties) {
		if (ts.isPropertyAssignment(property) && ts.isIdentifier(property.name) && property.name.text === propertyName) {
			return getLiteralValue(property.initializer);
		}
	}
	return undefined;
}

/**
 * Check if object literal has specific property with boolean value
 */
export function getBooleanPropertyValue(node: ts.ObjectLiteralExpression, propertyName: string): boolean | null {
	for (const property of node.properties) {
		if (ts.isPropertyAssignment(property) && ts.isIdentifier(property.name) && property.name.text === propertyName) {
			if (property.initializer.kind === ts.SyntaxKind.TrueKeyword) return true;
			if (property.initializer.kind === ts.SyntaxKind.FalseKeyword) return false;
		}
	}
	return null;
}

/**
 * Check if object literal has specific property
 */
export function hasObjectProperty(node: ts.ObjectLiteralExpression, propertyName: string): boolean {
	return getObjectPropertyValue(node, propertyName) !== undefined;
}
