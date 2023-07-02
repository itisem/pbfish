import ReservedPBFField from "../parsers/reserved";

describe("reserved pbf field", () => {
	test("everything is null", () => {
		const tester = new ReservedPBFField();
		expect(tester.value).toEqual(null);
		tester.value = "Bujumbura";
		expect(tester.value).toEqual(null);
		expect(tester.urlEncode()).toEqual("");
		expect(tester.jsonEncode()).toEqual(null);
	});
});