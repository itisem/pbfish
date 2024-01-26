import BoolPBFField from "../parsers/bool";

describe("bool", () => {
	test("decodes text well", () => {
		const field = new BoolPBFField();
		expect(field["_decodeValue"](null)).toBeUndefined();
		expect(field["_decodeValue"](undefined)).toBeUndefined();
		expect(field["_decodeValue"]("")).toBeUndefined();
		expect(field["_decodeValue"]("true")).toBe(true);
		expect(field["_decodeValue"]("false")).toBe(false);
		expect(field["_decodeValue"]("incorrectValue")).toBe(false);
	})
})