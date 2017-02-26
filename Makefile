tdd: build_test_schema
	./node_modules/.bin/mocha \
	test/ \
	--colors \
	--bail \
	--require babel-register
	--recursive \
	--check-leaks

build_test_schema:
	node build-test-schema.js

benchmark: build_test_schema
	node benchmark.js

test: build_test_schema benchmark
	./node_modules/.bin/mocha \
	test/ \
	--recursive \
	--check-leaks \
	--bail \
	--colors \
	--require babel-register

release: build_test_schema test
	./scripts/create-release.sh

.PHONY: release test build_test_schema tdd
