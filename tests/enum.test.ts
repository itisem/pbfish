import EnumPBFField from "../parsers/enum";

const baseFieldOptions = {
	codes: [
		{
			value: "Uzbekistan",
			code: 1
		},
		{
			value: "Kazakhstan",
			code: 2
		},
		{
			value: "Kyrgyzstan",
			code: 4
		},
		{
			value: "Tajikistan",
			code: 42
		}
	]
};

describe("enum pbf fields", () => {
	test("value can be set", () => {
		const tester = new EnumPBFField(baseFieldOptions);
		tester.value = "Uzbekistan";
		expect(tester.value).toBe("Uzbekistan");
		tester.value = 4;
		expect(tester.value).toBe("Kyrgyzstan");
	});
	test("value cannot be set to something wrong", () => {
		const tester = new EnumPBFField(baseFieldOptions);
		expect(() => tester.value = "Turkmenistan").toThrow();
		expect(() => tester.value = 3).toThrow();
	});
	test("value can be returned to be prepared for json encoding", () => {
		const tester = new EnumPBFField(baseFieldOptions);
		expect(tester.jsonEncode()).toEqual(null);
		tester.value = "Tajikistan";
		expect(tester.jsonEncode()).toEqual(42);
	});
	test("value can be urlencoded", () => {
		const tester = new EnumPBFField({...baseFieldOptions, fieldNumber: 3});
		expect(tester.urlEncode()).toEqual("");
		tester.value = "Kazakhstan";
		expect(tester.urlEncode()).toEqual("!3e2");
		const tester2 = new EnumPBFField({...baseFieldOptions, fieldNumber: 3, delimiter: "&"});
		tester2.value = "Kazakhstan";
		expect(tester2.urlEncode()).toEqual("&3e2");
	});
	test("urlencoding throws when field number is unset", () => {
		const tester = new EnumPBFField(baseFieldOptions);
		expect(() => tester.urlEncode()).toThrow();
	});
	test("encoding throws when a field is required", () => {
		const tester = new EnumPBFField({...baseFieldOptions, fieldNumber: 3, required: true});
		expect(() => tester.urlEncode()).toThrow();
		expect(() => tester.jsonEncode()).toThrow();
	});
})