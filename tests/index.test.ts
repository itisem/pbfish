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
		expect(location.toUrl()).toEqual("!1d1!2d2!3m1!1m2!1snl!3e1");
		const location2 = parser.create("Location");
		location2.value = {lat: 3, lng: 4, info: {address: {country: "de", building: "COMMERCIAL"}}};
		expect(location.toUrl()).toEqual("!1d1!2d2!3m1!1m2!1snl!3e1");
		expect(location2.toUrl()).toEqual("!1d3!2d4!3m1!1m2!1sde!3e2");
	});
	it("loads correct definitions even if they are strings", () => {
		const parser = new pbfish(JSON.stringify(goodDefinition));
		const location = parser.create("Location");
		location.value = {lat: 1, lng: 2, info: {address: {country: "nl"}}};
		expect(location.toUrl()).toEqual("!1d1!2d2!3m1!1m1!1snl");
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
		request2.fromUrl("!1m1!1sapiv3!2m2!1m2!3d1!4d2!2d500");
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
	expect(() => request3.fromUrl("!1m1!1sapiv3!2m2!3d53.210243!4d6.564092!8m1!3shello")).toThrow();
});

describe("required works", () => {
	const parser = new pbfish(SingleImageSearch);
	const request = parser.create("SingleImageSearchRequest");
	request.value = {location: {center: {lat: 1, lng: 2}}};
	expect(() => request.toArray()).toThrow();
	expect(() => request.toUrl()).toThrow();
})

describe("response", () => {
	const parser = new pbfish(SingleImageSearch);
	const response = parser.create("SingleImageSearchResponse");
	response.fromArray([[0],[[1],[2,"btK3njCWDNb4_jiiSatA1w"],null,[null,null,[["завулак Музычны","be"],["Минск, Минская область","ru"]]],[],[[[1],[[null,null,53.905239121316654,27.559823801030298],[208.98941],[44.81848,96.89398,7.6019073],null,"BY"],null,[[[[2,"btK3njCWDNb4_jiiSatA1w"],null,[[null,null,53.905239121316654,27.559823801030298],[208.98941],[44.81848,96.89398,7.6019073]]],[[2,"gtvJkNFr62ncytG4qMEz_g"],null,[[null,null,53.905169371809585,27.559804791159646],[210.44023],[91.52741,93.724976,5.751513]]],[[2,"MS-2dp9em43R4AMV_KBI1w"],null,[[null,null,53.905304243435296,27.559918929771868],[205.88283],[45.97461,94.57271,9.092471]],[null,null,[["завулак Музычны","be"]]]],[[2,"s88rdBq5UiYKvp6ojwA7_Q"],null,[[null,null,53.905479826135277,27.560144374336062],[202.08742],[28.201996,96.657234,6.3418956]]],[[2,"c2BqTxGRC9KqvlRwJ27cZA"],null,[[null,null,53.905395944489875,27.560048819623688],[202.77957],[46.36395,97.33583,5.0403695]]],[[2,"ZDu-3jEuokxB-FNpYn_xHQ"],null,[[null,null,53.904908915737018,27.559312055219891],[214.37727],[57.09269,94.83385,6.6179338]]],[[2,"QbuwjBXMSXeuRP_c6L70XQ"],null,[[null,null,53.904970474543184,27.559439967147497],[213.51726],[57.564507,98.084335,7.4587083]]],[[2,"lsXdDY0Zpzl_dirahtzBnw"],null,[[null,null,53.905039252244428,27.55955003140669],[212.46327],[47.06176,94.68602,6.994767]]],[[2,"JBIX4bjXwq_8GDFoyUSOfA"],null,[[null,null,53.905107854944617,27.5596553763756],[211.44838],[46.33899,94.70118,4.9155283]]],[[2,"r5kaVnMpdB2XX8QX9GnA4Q"],null,[[null,null,53.905182852749782,27.559967121218389],[210.41399],[92.57081,88.66972,8.748831]]],[[2,"ReTt8KtvSrIdJVme2VE9_Q"],null,[[null,null,53.905200471710479,27.560125088650889],[210.44441],[123.01479,92.15849,5.1426544]]],[[2,"deZm--LXpOoQEk53_viUFQ"],null,[[null,null,53.90513414983652,27.56024161695008],[210.52853],[143.19923,94.00648,5.639168]]],[[2,"Gqy0v_k-2whe3Aye2KEjog"],null,[[null,null,53.905046459353066,27.560277102248904],[210.76732],[183.79987,92.40483,4.2567706]]],[[2,"8aFrB7sgHGo0iHy4sjznGQ"],null,[[null,null,53.904960598228172,27.560305224588696],[211.00723],[166.72595,91.779915,5.4553037]]]]],null,null,[[1,[null,null,null,183.02574]],[2,[null,null,null,39.93651]]]]],[3,2,1,null,null,[null,null,"launch",[6]],null,[2018,8]],["https://www.google.com/local/imagery/report/?cb_client=apiv3&image_key=!1e2!2sbtK3njCWDNb4_jiiSatA1w"]],[134.81848]]);
	expect(1).toEqual(1);
})