import pbfish from "../index";

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

describe("loading things works", () => {
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
		expect(() => parser.create("Location")).toThrow();
	});
})