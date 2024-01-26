import pbfish from "../index";

import SingleImageSearch from "./single-image-search.json";

const goodDefinition = {
	nested: {
		Location: {
			fields: {
				lat: {
					rule: "required",
					type: "double",
					id: 1
				},
				lng: {
					rule: "required",
					type: "double",
					id: 2
				},
				info: {
					type: "LocationInfo", // LocationInfo is defined inside our nesting
					id: 3
				}
			},
			nested: {
				LocationInfo: {
					fields: {
						address: {
							type: "Address", // Address is defined inside the main definition
							id: 1
						}
					}
				}
			}
		},
		Address: {
			fields: {
				country: {
					type: "string",
					id: 1
				},
				city: {
					type: "string",
					id: 2
				},
				building: {
					type: "Building",
					id: 3
				}
			}
		},
		Building: {
			values: {
				RESIDENTIAL: 1,
				COMMERCIAL: 2
			}
		}
	}
};

const badDefinition = {
	nested: {
		Location: {
			fields: {
				lat: {
					type: "yeehaw", // yeehaw is an undefined type
					id: 4
				}
			}
		}
	}
}

describe("loading simple definitions", () => {
	it("loads correct definitions", () => {
		const parser = new pbfish(goodDefinition);
		const location = parser.create("Location");
		location.value = {lat: 1, lng: 2, info: {address: {country: "nl", building: "RESIDENTIAL"}}};
		expect(location.toUrl()).toEqual("!1d1!2d2!3m3!1m2!1snl!3e1");
		const location2 = parser.create("Location");
		location2.value = {lat: 3, lng: 4, info: {address: {country: "de", building: "COMMERCIAL"}}};
		expect(location.toUrl()).toEqual("!1d1!2d2!3m3!1m2!1snl!3e1");
		expect(location2.toUrl()).toEqual("!1d3!2d4!3m3!1m2!1sde!3e2");
	});
	it("loads correct definitions even if they are strings", () => {
		const parser = new pbfish(JSON.stringify(goodDefinition));
		const location = parser.create("Location");
		location.value = {lat: 1, lng: 2, info: {address: {country: "nl"}}};
		expect(location.toUrl()).toEqual("!1d1!2d2!3m2!1m1!1snl");
	})
	it("fails to load incorrect definitions", () => {
		const parser = new pbfish(badDefinition);
		const location = parser.create("Location");
		expect(() => {location.value = {lat: 3}}).toThrow();
	});
})

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
		expect(request.location.center.lat).toEqual(53.210243);
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
		expect(request.location.center.lat).toEqual(53.210243);
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
		request2.fromUrl("!1m1!1sapiv3!2m4!1m2!3d1!4d2!2d500");
		expect(request2.value).toMatchObject({context: {productId: "apiv3"}});
	});
});

describe("oneof constraint violations are not accepted", () => {
	const parser = new pbfish(SingleImageSearch);
	const request1 = parser.create("SingleImageSearchRequest");
	expect(() => request1.value = {
		location: {
			lat: 1,
			lng: 2
		},
		feature: {
			tag: "hello"
		}
	}).toThrow();
	const request2 = parser.create("SingleImageSearchRequest");
	expect(() => request2.fromArray([
		["apiv3"],
		[[undefined,undefined,53.210243,6.564092],500],
		[undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,undefined,[[[2,true,2]]]],
		[[2,6]],
		undefined,
		undefined,
		undefined,
		[undefined,undefined,"hello"]
	])).toThrow();
	const request3 = parser.create("SingleImageSearchRequest");
	expect(() => request3.fromUrl("!1m1!1sapiv3!2m2!3d53.210243!4d6.564092!8m2!3shello")).toThrow();
});

describe("required works", () => {
	const parser = new pbfish(SingleImageSearch);
	const request = parser.create("SingleImageSearchRequest");
	request.value = {location: {center: {lat: 1, lng: 2}}};
	expect(() => request.toArray()).toThrow();
	expect(() => request.toUrl()).toThrow();
	expect(() => request.value).toThrow();
});