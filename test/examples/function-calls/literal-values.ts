/**
 * Example file for testing literal value extraction
 * Contains function calls with various literal argument types
 */

function testFunction(stringArg: string, numberArg: number, booleanArg: boolean, nullArg: null, undefinedArg: undefined) {
	console.log("Arguments received:", stringArg, numberArg, booleanArg, nullArg, undefinedArg);
}

// Function calls with literal values
testFunction("hello world", 42, true, null, undefined);
testFunction("another string", 3.14, false, null, undefined);
testFunction("", 0, true, null, undefined);

// Function call with mixed literal and complex values
function mixedFunction(name: string, age: number, options: object) {
	console.log(`Name: ${name}, Age: ${age}`, options);
}

const config = { debug: true };
mixedFunction("Alice", 25, config);
mixedFunction("Bob", 30, { enabled: false });

function runTests() {
	testFunction("exported call", 100, false, null, undefined);
}

// Export a function call directly
export default runTests();
