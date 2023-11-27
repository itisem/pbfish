import SingleImageSearch from "./single-image-search.json";

import pbfish from "../index";

describe("can load large definitions", () => {
	test("loading large definitions doesn't brick the code", () => {
		const startTime = Date.now();
		const parser = new pbfish(SingleImageSearch);
		parser.create("SingleImageSearchRequest");
		const endTime = Date.now();
		expect(endTime - startTime).toBeLessThan(100);
	});
	test("setting information for large definitions doesn't brick the code either", () => {
		const parser = new pbfish(SingleImageSearch);
		const request = parser.create("SingleImageSearchRequest");
		const startTime = Date.now();
		request.value = {
			context: {
				productId: "apiv3"
			},
			location: {
				center: {
					lat: 53.210243,
					lng: 6.564092
				},
				radius: 500
			},
			queryOptions: {
				clientCapabilities: {
					renderStrategy: [
						{
							frontend: "OFFICIAL",
							tiled: true,
							imageFormat: "OFFICIAL_FORMAT"
						}
					]
				}
			},
			responseSpecification: {
				component: [
					"INCLUDE_DESCRIPTION",
					"INCLUDE_LINKED_PANORAMAS"
				],
			},
		};
		const endTime = Date.now();
		expect(endTime - startTime).toBeLessThan(100);
		console.log(JSON.stringify(request.toArray()));
		expect(request.toArray()).toEqual([
			["apiv3"],
			[[undefined,undefined,53.210243,6.564092],500],
			[undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,[[[2,true,2]]]],
			[[2,6]]
		]);
		expect(() => request.toUrl()).toThrow();
	});
	test("loading stuff works", () => {
		const parser = new pbfish(SingleImageSearch);
		const request = parser.create("SingleImageSearchRequest");
		request.fromArray([
			["apiv3"],
			[[undefined,undefined,53.210243,6.564092],500],
			[undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,[[[2,true,2]]]],
			[[2,6]]
		]);
		expect(request.value).toMatchObject({
			context: {
				productId: "apiv3"
			},
			location: {
				center: {
					lat: 53.210243,
					lng: 6.564092
				},
				radius: 500
			},
			queryOptions: {
				clientCapabilities: {
					renderStrategy: [
						{
							frontend: "OFFICIAL",
							tiled: true,
							imageFormat: "OFFICIAL_FORMAT"
						}
					]
				}
			},
			responseSpecification: {
				component: [
					"INCLUDE_DESCRIPTION",
					"INCLUDE_LINKED_PANORAMAS"
				],
			},
		});
		const request2 = parser.create("SingleImageSearchRequest");
		request2.fromUrl("!1m1!1sapiv3");
		expect(request2.value).toEqual({context: {productId: "apiv3"}});
	});
})