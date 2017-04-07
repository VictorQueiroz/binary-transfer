import assert from 'assert';
import SchemaBuilder from '../src/SchemaBuilder';

describe('SchemaBuilder', function() {
	let builder;

	describe('parseIdentifier()', function() {
		let schemas;

		beforeEach(() => {
			schemas = [{
				name: 'coords',
				constructors: {
					predicates: [{
						id: 2334324,
						name: 'geoPoint',
						type: 'GeoPoint',
						params: [{
							name: 'latitude',
							type: 'double'
						}, {
							name: 'longitude',
							type: 'double'
						}]
					}, {
						id: 3588494,
						name: 'geoPointEmpty',
						type: 'GeoPoint',
						params: []
					}]
				}
			}, {
				name: 'common',
				constructors: {
					predicates: [{
						id: 1232134,
						name: 'inputGeolocation',
						type: 'InputGeolocationon',
						params: [{
							name: 'geoPoint',
							type: 'GeoPoint'
						}]
					}]
				}
			}];
			builder = new SchemaBuilder({
				schemas: schemas
			});
		});

		it('should support types from multiple schemas', function() {
			assert.deepEqual(builder.parseIdentifier('GeoPoint', ...schemas), {
				type: 'GeoPoint',
				possibleIds: [
					2334324,
					3588494
				]
			});
		});
	});
});
