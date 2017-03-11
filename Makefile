tdd: build_test_schema
	NODE_ENV=development ./node_modules/.bin/mocha \
	test/ \
	--recursive \
	--colors \
	--bail \
	--watch \
	--require babel-register \
	--check-leaks

build_test_schema:
	node build-test-schema.js

benchmark: build_test_schema
	node benchmark/index.js

test: build_test_schema benchmark
	NODE_ENV=development ./node_modules/.bin/mocha \
	test/ \
	--recursive \
	--check-leaks \
	--bail \
	--colors \
	--require babel-register

release: build_test_schema test
	rm -rvf lib/
	./node_modules/.bin/babel src/ -d lib/
	cp -rv src/templates lib/templates

.PHONY: release test build_test_schema tdd
