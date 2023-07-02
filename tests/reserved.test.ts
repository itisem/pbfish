import ReservedPBFField from "../parsers/reserved";

describe("reserved pbf field", () => {
	test("everything is null", () => {
		const tester = new ReservedPBFField();
		expect(tester.value).toEqual(undefined);
		tester.value = "Bujumbura";
		expect(tester.value).toEqual(undefined);
		expect(tester.urlEncode()).toEqual("");
		expect(tester.arrayEncode()).toBeUndefined();
	});
});