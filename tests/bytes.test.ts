import BytesPBFField from "../parsers/bytes";

describe("bytes", () => {
	test("importing", () => {
		const field = new BytesPBFField();
		field.value = new Uint8Array([1, 2, 3, 4]);
		expect(field.value).toEqual(new Uint8Array([1, 2, 3, 4]));
		field.fromUrl("SGVsbG8");
		expect(field.value).toEqual(new Uint8Array([72, 101, 108, 108, 111]));
		field.value = undefined;
		expect(field.value).toEqual(undefined);
		field.fromArray("SGVsbG8=");
		expect(field.value).toEqual(new Uint8Array([72, 101, 108, 108, 111]));
		expect(() => field.value = [new Uint8Array([1]), new Uint8Array([2])]).toThrow();
		expect(() => field.fromArray(["SGVsbG8="])).toThrow();
	});
	test("importing repeated", () => {
		const field = new BytesPBFField({repeated: true});
		field.value = [new Uint8Array([1, 2, 3, 4])];
		expect(field.value).toEqual([new Uint8Array([1, 2, 3, 4])]);
		expect(() => field.fromUrl("SGVsbG8")).toThrow();
		field.value = undefined;
		expect(field.value).toEqual(undefined);
		field.fromArray(["SGVsbG8="]);
		expect(field.value).toEqual([new Uint8Array([72, 101, 108, 108, 111])]);
		expect(() => field.value = new Uint8Array([1, 2, 3, 4])).toThrow();
		expect(() => field.fromArray("SGVsbG8=")).toThrow();
	});
});