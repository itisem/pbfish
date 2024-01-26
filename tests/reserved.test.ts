import ReservedPBFField from "../parsers/reserved";

describe("reserved pbf field", () => {
	test("everything is null", () => {
		const tester = new ReservedPBFField();
		expect(tester.value).toEqual(undefined);
		tester.value = "Bujumbura";
		expect(tester.value).toEqual(undefined);
		expect(tester.toUrl()).toEqual("");
		expect(tester.toArray()).toBeUndefined();
		expect(() => new ReservedPBFField({repeated: true})).toThrow();
		expect(() => new ReservedPBFField({required: true})).toThrow();
		expect(tester.validateValue(undefined)).toBeUndefined();
		expect(tester.fromUrl()).toBeUndefined();
		expect(tester.fromArray()).toBeUndefined();
	});
});